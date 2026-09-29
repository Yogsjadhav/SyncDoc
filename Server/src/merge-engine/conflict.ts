import { ASTOperation, ASTDocument, ASTText, ConflictInfo, Mark, ASTBlock } from './types';
import { NodeIndex, isDescendant, buildNodeIndex } from './nodeIndex';

// Types of conflicts that can happen when two users edit at the same time
export type OpClass =
  | 'NOOP'        // Operations on different nodes - no conflict
  | 'IDEMPOTENT'  // Same thing done twice (like deleting the same node) - ignore second one
  | 'ORDER'       // Two users insert at same position - need to decide which goes first
  | 'MARK_MERGE'  // Two users apply formatting to same text - combine both
  | 'TEXT_MERGE'  // Two users edit same text - try to merge the changes
  | 'DELETE_EDIT' // One user deletes while another edits - might need to restore deleted content
  | 'ADJUST';     // Text was split, need to adjust which node the operation targets

// Get the node ID that an operation is targeting
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

// Determine what type of conflict (if any) exists between two operations
export function classifyOpPair(
  incoming: ASTOperation,    // The operation we're trying to apply
  committed: ASTOperation,   // The operation that was already applied
  index: NodeIndex
): OpClass {
  // Both trying to delete the same node - only need to do it once
  if (incoming.op === 'delete-node' && committed.op === 'delete-node' && incoming.nodeId === committed.nodeId)
    return 'IDEMPOTENT';

  // Someone deleted a node - check if the incoming operation targets that deleted node
  if (committed.op === 'delete-node') {
    const tid = targetId(incoming);
    if (tid && (tid === committed.nodeId || isDescendant(tid, committed.nodeId, index)))
      return 'DELETE_EDIT';  // Trying to edit something that was deleted
    return 'NOOP';  // Editing something unrelated
  }

  // Two users inserting at the exact same position - need to pick an order
  if (incoming.op === 'insert-node' && committed.op === 'insert-node' &&
      incoming.parentId === committed.parentId && incoming.index === committed.index)
    return 'ORDER';

  // The node was split (like pressing Enter) - need to adjust which part we're editing
  if (committed.op === 'split-node' && targetId(incoming) === committed.nodeId)
    return 'ADJUST';

  // Two users changed formatting on the same text
  if (incoming.op === 'update-marks' && committed.op === 'update-marks' &&
      incoming.nodeId === committed.nodeId)
    return 'MARK_MERGE';

  // Two users edited the same text content
  if (incoming.op === 'update-text' && committed.op === 'update-text' &&
      incoming.nodeId === committed.nodeId)
    return 'TEXT_MERGE';

  return 'NOOP';  // No conflict - operations are independent
}

// Result of resolving a conflict between two operations
export interface ResolveResult {
  ops: ASTOperation[];        // The transformed operations to apply
  conflict?: ConflictInfo;    // Information about the conflict (if any)
}

// Resolve a conflict between two operations, producing the correct transformed operation
// This is the heart of Operational Transformation - it figures out how to merge concurrent edits
export function resolveOpPair(
  incoming: ASTOperation,      // The operation we're trying to apply
  committed: ASTOperation,     // The operation that was already applied
  index: NodeIndex,
  incomingUserId: string,      // Who made the incoming operation
  committedUserId: string,     // Who made the committed operation
  _ast: ASTDocument
): ResolveResult {
  const cls = classifyOpPair(incoming, committed, index);

  switch (cls) {
    // No conflict - just apply the operation as-is
    case 'NOOP':
      return { ops: [incoming] };

    // Same thing done twice - don't do it again
    case 'IDEMPOTENT':
      return { ops: [] };

    // Two users inserted at same position - use user IDs to decide order
    case 'ORDER': {
      const inc = incoming as Extract<ASTOperation, { op: 'insert-node' }>;
      const com = committed as Extract<ASTOperation, { op: 'insert-node' }>;
      // User with alphabetically larger ID goes after (higher index)
      const bumpIncoming = incomingUserId > committedUserId;
      return { ops: [bumpIncoming ? { ...inc, index: inc.index + 1 } : inc] };
    }

    // Two users applied formatting to same text - combine both styles
    case 'MARK_MERGE': {
      const inc = incoming as Extract<ASTOperation, { op: 'update-marks' }>;
      const com = committed as Extract<ASTOperation, { op: 'update-marks' }>;
      // Union of both sets of formatting marks
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

    // Two users edited the same text content - try to merge their changes
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

    // One user deleted content while another was editing it
    case 'DELETE_EDIT': {
      const del = committed as Extract<ASTOperation, { op: 'delete-node' }>;
      const deletedEntry = index.get(del.nodeId);
      if (!deletedEntry) return { ops: [] };

      // Check if the edit is actually meaningful (not just setting to same value)
      let meaningful = true;
      if (incoming.op === 'update-text') {
        const nodeEntry = index.get(incoming.nodeId);
        const currentText = nodeEntry ? ((nodeEntry.node as ASTText).text ?? '') : '';
        meaningful = incoming.text !== currentText;
      }
      if (!meaningful) return { ops: [] };

      // Restore the deleted content, then apply the edit
      // This prevents losing someone's work when content is accidentally deleted
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

    // Text was split (like pressing Enter) - adjust which part we're editing
    case 'ADJUST': {
      const split = committed as Extract<ASTOperation, { op: 'split-node' }>;
      if (incoming.op !== 'update-text') return { ops: [incoming] };
      // If the edit was in the first half, keep original node ID
      // If it was in the second half, use the new node ID from the split
      if (incoming.text.length <= split.offset) return { ops: [incoming] };
      return { ops: [{ op: 'update-text', nodeId: split.newNodeId, text: incoming.text.slice(split.offset) }] };
    }

    default:
      return { ops: [incoming] };
  }
}

// Smart text merging when two users edit the same text at once
// Tries to keep both users' changes when possible
export function threeWayTextMerge(
  theirs: string,    // What the committed user changed the text to
  ours: string       // What the incoming user changed the text to
): { merged: string; hadConflict: boolean } {
  // If both users ended up with the same text, no conflict
  if (theirs === ours) return { merged: theirs, hadConflict: false };

  // Find the common beginning (prefix) that both users kept
  let pre = 0;
  while (pre < theirs.length && pre < ours.length && theirs[pre] === ours[pre]) pre++;

  // Find the common ending (suffix) that both users kept
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

  // If one user only added text (didn't delete anything), we can safely merge both
  if (theirMid === '' || ourMid === '')
    return { merged: prefix + theirMid + ourMid + suffix, hadConflict: false };

  // Both users changed the same part - we have to pick one (keep the committed version)
  return { merged: prefix + theirMid + suffix, hadConflict: true };
}
