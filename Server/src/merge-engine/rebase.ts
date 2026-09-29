import { ASTDocument, ASTOperation, ConflictInfo } from './types';
import { buildNodeIndex } from './nodeIndex';
import { resolveOpPair } from './conflict';

// A batch of operations from one user that was already committed to the document
export interface CommittedBatch { 
  ops: ASTOperation[];    // The operations they made
  userId: string;         // Who made them
}

// Result of rebasing operations against other users' changes
export interface RebaseResult {
  resolvedOps: ASTOperation[];    // The transformed operations to apply
  conflicts: ConflictInfo[];       // Any conflicts that were resolved
}

// Rebase = transform one user's operations to account for other users' operations
// This is the core algorithm that makes collaborative editing work
// 
// Example: User A types "Hello" and User B types "World" at the same position
// Rebase figures out how to transform User B's operation so both texts appear correctly
export function rebase(
  incomingOps: ASTOperation[],      // Operations from a user who was offline or delayed
  committedBatches: CommittedBatch[],  // Operations that were already applied while they were offline
  currentAst: ASTDocument,          // Current document state (after committed operations)
  incomingUserId: string            // Who made the incoming operations
): RebaseResult {
  const resolvedOps: ASTOperation[] = [];
  const conflicts: ConflictInfo[] = [];

  // Flatten all committed operations into a single list with user IDs
  const allCommitted = committedBatches.flatMap(b => b.ops.map(op => ({ op, userId: b.userId })));

  // Process each incoming operation
  for (const incoming of incomingOps) {
    let cur: ASTOperation = incoming;
    let drop = false;  // Should we skip this operation?
    let extras: ASTOperation[] = [];  // Extra operations needed (like resurrecting deleted content)

    // Build a fresh index for each operation so we see the current document state
    // (Important for operations that resurrect deleted nodes)
    const index = buildNodeIndex(currentAst);

    // Transform this operation against every committed operation
    for (const { op: committed, userId: cUid } of allCommitted) {
      const result = resolveOpPair(cur, committed, index, incomingUserId, cUid, currentAst);
      
      // Record any conflicts that occurred
      if (result.conflict) conflicts.push(result.conflict);
      
      // No operations means this operation should be dropped (e.g., deleting already deleted node)
      if (result.ops.length === 0) { 
        drop = true; 
        break; 
      }
      
      // Multiple operations means we need to do extra work (e.g., resurrect a deleted node first)
      if (result.ops.length > 1) {
        extras = result.ops.slice(0, -1);  // All but the last are extras
        cur = result.ops[result.ops.length - 1];  // Continue transforming the last one
      } else {
        cur = result.ops[0];  // Single operation - continue transforming it
      }
    }

    // Add the transformed operation(s) to the result
    if (!drop) resolvedOps.push(...extras, cur);
  }

  return { resolvedOps, conflicts };
}
