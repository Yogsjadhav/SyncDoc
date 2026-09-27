export { applyOp, applyOps } from './applyOp';
export { rebase } from './rebase';
export { buildNodeIndex, isDescendant } from './nodeIndex';
export { threeWayTextMerge } from './conflict';
export { createEmptyDocument } from './types';
export type { ASTDocument, ASTBlock, ASTInline, ASTText, ASTNode, ASTOperation, ConflictInfo, Mark } from './types';
export type { RebaseResult, CommittedBatch } from './rebase';
