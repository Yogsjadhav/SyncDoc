import { ASTOperation, ASTDocument, ASTText, ConflictInfo, Mark, ASTBlock } from './types';
import { NodeIndex, isDescendant, buildNodeIndex } from './nodeIndex';

// ─── Op pair classification ───────────────────────────────────────────────────
export type OpClass =
  | 'NOOP'        // different nodes — pass through
  | 'IDEMPOTENT'  // same node deleted twice — drop second
  | 'ORDER'       // concurrent inserts at same position — deterministic order
  | 'MARK_MERGE'  // concurrent marks on same node — union
  | 'TEXT_MERGE'  // concurrent text edits on same node — three-way merge
  | 'DELETE_EDIT' // one deletes, other edits inside — resurrect if meaningful
  | 'ADJUST';     // split committed — remap incoming op to correct half

function targetId(op: ASTOperation): string | null {
  switch (op.op) {
    case 'insert-node':  return op.node.nodeId;
    case 'delete-node':  return op.nodeId;
    case 'update-text':  return op.nodeId;
    case 'update-marks': return op.nodeId;
    case 'update-attrs': return op.nodeId;
    case 'move-node':    return op.nodeId;
    case 'split-node':   return op.nodeId;
    case 'merge-node':   return op.nodeId;
    default:             return null;
  }
}

export function classifyOpPair(
  incoming: ASTOperation,
  committed: ASTOperation,
  index: NodeIndex
): OpClass {
  // Both delete same node
  if (incoming.op === 'delete-node' && committed.op === 'delete-node' && incoming.nodeId === committed.nodeId)
    return 'IDEMPOTENT';

  // Committed deleted something — check if incoming targets it or a descendant
  if (committed.op === 'delete-node') {
    const tid = targetId(incoming);
    if (tid && (tid === committed.nodeId || isDescendant(tid, committed.nodeId, index)))
      return 'DELETE_EDIT';
    return 'NOOP';
  }

  // Concurrent inserts at same parent+index
  if (incoming.op === 'insert-node' && committed.op === 'insert-node' &&
      incoming.parentId === committed.parentId && incoming.index === committed.index)
    return 'ORDER';

  // Committed split the node incoming targets
  if (committed.op === 'split-node' && targetId(incoming) === committed.nodeId)
    return 'ADJUST';

  // Same node — mark conflict
  if (incoming.op === 'update-marks' && committed.op === 'update-marks' &&
      incoming.nodeId === committed.nodeId)
    return 'MARK_MERGE';

  // Same node — text conflict
  if (incoming.op === 'update-text' && committed.op === 'update-text' &&
      incoming.nodeId === committed.nodeId)
    return 'TEXT_MERGE';

  return 'NOOP';
}

// ─── Resolution ───────────────────────────────────────────────────────────────
export interface ResolveResult {
  ops: ASTOperation[];
  conflict?: ConflictInfo;
}

export function resolveOpPair(
  incoming: ASTOperation,
  committed: ASTOperation,
  index: NodeIndex,
  incomingUserId: string,
  committedUserId: string,
  _ast: ASTDocument
): ResolveResult {
  const cls = classifyOpPair(incoming, committed, index);

  switch (cls) {
    case 'NOOP':
      return { ops: [incoming] };

    case 'IDEMPOTENT':
      return { ops: [] };

    case 'ORDER': {
      const inc = incoming as Extract<ASTOperation, { op: 'insert-node' }>;
      const com = committed as Extract<ASTOperation, { op: 'insert-node' }>;
      // Lexicographically smaller userId goes first (lower index)
      const bumpIncoming = incomingUserId > committedUserId;
      return { ops: [bumpIncoming ? { ...inc, index: inc.index + 1 } : inc] };
    }

    case 'MARK_MERGE': {
      const inc = incoming as Extract<ASTOperation, { op: 'update-marks' }>;
      const com = committed as Extract<ASTOperation, { op: 'update-marks' }>;
      const merged = Array.from(new Set([...com.marks, ...inc.marks])) as Mark[];
      return {
        ops: [{ op: 'update-marks', nodeId: inc.nodeId, marks: merged }],
        conflict: {
          type: 'concurrent-marks',
          description: 'Two users changed formatting on the same text — both styles applied.',
          nodeId: inc.nodeId,
          resolution: 'merged',
        },
      };
    }

    case 'TEXT_MERGE': {
      const inc = incoming as Extract<ASTOperation, { op: 'update-text' }>;
      const com = committed as Extract<ASTOperation, { op: 'update-text' }>;
      const { merged, hadConflict } = threeWayTextMerge(com.text, inc.text);
      const result: ResolveResult = { ops: [{ op: 'update-text', nodeId: inc.nodeId, text: merged }] };
      if (hadConflict) {
        result.conflict = {
          type: 'concurrent-text',
          description: 'Two users edited the same text simultaneously — changes were merged.',
          nodeId: inc.nodeId,
          resolution: hadConflict ? 'last-write-wins' : 'merged',
        };
      }
      return result;
    }

    case 'DELETE_EDIT': {
      const del = committed as Extract<ASTOperation, { op: 'delete-node' }>;
      const deletedEntry = index.get(del.nodeId);
      if (!deletedEntry) return { ops: [] };

      // Is it a meaningful edit?
      let meaningful = true;
      if (incoming.op === 'update-text') {
        const nodeEntry = index.get(incoming.nodeId);
        const currentText = nodeEntry ? ((nodeEntry.node as ASTText).text ?? '') : '';
        meaningful = incoming.text !== currentText;
      }
      if (!meaningful) return { ops: [] };

      // Resurrect the deleted ancestor, then apply the incoming edit
      const parent = deletedEntry.parent;
      const resOp: ASTOperation = {
        op: 'insert-node',
        parentId: parent ? (parent as { nodeId: string }).nodeId : 'doc-root',
        index: deletedEntry.indexInParent,
        node: deletedEntry.node as ASTBlock,
      };
      return {
        ops: [resOp, incoming],
        conflict: {
          type: 'delete-vs-edit',
          description: 'A block you were editing was deleted — it has been restored with your changes.',
          nodeId: del.nodeId,
          resolution: 'resurrected',
        },
      };
    }

    case 'ADJUST': {
      const split = committed as Extract<ASTOperation, { op: 'split-node' }>;
      if (incoming.op !== 'update-text') return { ops: [incoming] };
      // If incoming text fits in the first half, keep nodeId; else remap to second half
      if (incoming.text.length <= split.offset) return { ops: [incoming] };
      return { ops: [{ op: 'update-text', nodeId: split.newNodeId, text: incoming.text.slice(split.offset) }] };
    }

    default:
      return { ops: [incoming] };
  }
}

// ─── Three-way text merge ─────────────────────────────────────────────────────
export function threeWayTextMerge(
  theirs: string,
  ours: string
): { merged: string; hadConflict: boolean } {
  if (theirs === ours) return { merged: theirs, hadConflict: false };

  // Common prefix
  let pre = 0;
  while (pre < theirs.length && pre < ours.length && theirs[pre] === ours[pre]) pre++;

  // Common suffix (not overlapping the prefix)
  let suf = 0;
  while (
    suf < theirs.length - pre &&
    suf < ours.length - pre &&
    theirs[theirs.length - 1 - suf] === ours[ours.length - 1 - suf]
  ) suf++;

  const prefix   = theirs.slice(0, pre);
  const suffix   = suf > 0 ? theirs.slice(theirs.length - suf) : '';
  const theirMid = theirs.slice(pre, theirs.length - suf);
  const ourMid   = ours.slice(pre, ours.length - suf);

  // One side is empty in the middle → non-conflicting addition
  if (theirMid === '' || ourMid === '')
    return { merged: prefix + theirMid + ourMid + suffix, hadConflict: false };

  // Both changed the same middle region → last-write-wins (keep committed = theirs)
  return { merged: prefix + theirMid + suffix, hadConflict: true };
}
