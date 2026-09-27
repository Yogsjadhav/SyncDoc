import { ASTDocument, ASTOperation, ConflictInfo } from './types';
import { buildNodeIndex } from './nodeIndex';
import { resolveOpPair } from './conflict';

export interface CommittedBatch { ops: ASTOperation[]; userId: string }

export interface RebaseResult {
  resolvedOps: ASTOperation[];
  conflicts: ConflictInfo[];
}

/**
 * Rebase incomingOps (from incomingUserId, based on baseVersion) against all
 * committedBatches that were committed after that version.
 *
 * Pure function — no I/O, no mutation of inputs.
 */
export function rebase(
  incomingOps: ASTOperation[],
  committedBatches: CommittedBatch[],
  currentAst: ASTDocument,
  incomingUserId: string
): RebaseResult {
  const resolvedOps: ASTOperation[] = [];
  const conflicts: ConflictInfo[] = [];

  // Flatten committed ops with their userId
  const allCommitted = committedBatches.flatMap(b => b.ops.map(op => ({ op, userId: b.userId })));

  for (const incoming of incomingOps) {
    let cur: ASTOperation = incoming;
    let drop = false;
    let extras: ASTOperation[] = [];

    // Rebuild index for each incoming op so resurrection ops from earlier
    // iterations are reflected (correctness over micro-perf for MVP)
    const index = buildNodeIndex(currentAst);

    for (const { op: committed, userId: cUid } of allCommitted) {
      const result = resolveOpPair(cur, committed, index, incomingUserId, cUid, currentAst);
      if (result.conflict) conflicts.push(result.conflict);
      if (result.ops.length === 0) { drop = true; break; }
      if (result.ops.length > 1) {
        extras = result.ops.slice(0, -1);
        cur = result.ops[result.ops.length - 1];
      } else {
        cur = result.ops[0];
      }
    }

    if (!drop) resolvedOps.push(...extras, cur);
  }

  return { resolvedOps, conflicts };
}
