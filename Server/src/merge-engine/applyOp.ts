import { ASTDocument, ASTNode, ASTText, ASTOperation } from './types';
import { buildNodeIndex, replaceNode, removeNode, insertNodeAt } from './nodeIndex';

/**
 * Apply one operation to an AST.
 * Pure function — never mutates the input; returns a structurally-shared new AST.
 */
export function applyOp(ast: ASTDocument, op: ASTOperation): ASTDocument {
  switch (op.op) {
    case 'insert-node':
      return insertNodeAt(ast, op.parentId, op.index, op.node as ASTNode);

    case 'delete-node':
      return removeNode(ast, op.nodeId);

    case 'update-text':
      return replaceNode(ast, op.nodeId, node => {
        if (node.type !== 'text') return node;
        return { ...node, text: op.text } as ASTNode;
      });

    case 'update-marks':
      return replaceNode(ast, op.nodeId, node => {
        if (node.type !== 'text') return node;
        return { ...node, marks: op.marks } as ASTNode;
      });

    case 'update-attrs':
      return replaceNode(ast, op.nodeId, node => ({ ...node, ...op.attrs } as ASTNode));

    case 'move-node': {
      const index = buildNodeIndex(ast);
      const entry = index.get(op.nodeId);
      if (!entry) return ast;
      const moving = entry.node;
      let updated = removeNode(ast, op.nodeId);
      updated = insertNodeAt(updated, op.newParentId, op.newIndex, moving);
      return updated;
    }

    case 'split-node': {
      const index = buildNodeIndex(ast);
      const entry = index.get(op.nodeId);
      if (!entry || !entry.parent || entry.node.type !== 'text') return ast;
      const orig = entry.node as ASTText;
      const first: ASTText  = { ...orig, text: orig.text.slice(0, op.offset) };
      const second: ASTText = { nodeId: op.newNodeId, type: 'text', text: orig.text.slice(op.offset), marks: [...orig.marks] };
      let updated = replaceNode(ast, op.nodeId, () => first as ASTNode);
      updated = insertNodeAt(updated, (entry.parent as ASTNode).nodeId, entry.indexInParent + 1, second as ASTNode);
      return updated;
    }

    case 'merge-node': {
      const index = buildNodeIndex(ast);
      const target = index.get(op.nodeId)?.node;
      const withNode = index.get(op.withNodeId)?.node;
      if (!target || !withNode || target.type !== 'text' || withNode.type !== 'text') return ast;
      let updated = replaceNode(ast, op.nodeId, () => ({
        ...target, text: (target as ASTText).text + (withNode as ASTText).text,
      } as ASTNode));
      updated = removeNode(updated, op.withNodeId);
      return updated;
    }

    default:
      return ast; // unknown / future op — no-op
  }
}

/** Apply an array of operations sequentially. Pure. */
export function applyOps(ast: ASTDocument, ops: ASTOperation[]): ASTDocument {
  return ops.reduce((cur, op) => applyOp(cur, op), ast);
}
