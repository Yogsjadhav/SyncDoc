import { ASTDocument, ASTNode, ASTText, ASTOperation } from './types';
import { buildNodeIndex, replaceNode, removeNode, insertNodeAt } from './nodeIndex';

// Apply a single editing operation to the document
// This is a pure function - it never changes the original document, always returns a new one
// This is important for keeping track of history and enabling undo/redo
export function applyOp(ast: ASTDocument, op: ASTOperation): ASTDocument {
  switch (op.op) {
    // Add a new node (paragraph, heading, text, etc.) at a specific position
    case 'insert-node':
      return insertNodeAt(ast, op.parentId, op.index, op.node as ASTNode);

    // Remove a node from the document
    case 'delete-node':
      return removeNode(ast, op.nodeId);

    // Change the text content of a text node (when user types)
    case 'update-text':
      return replaceNode(ast, op.nodeId, node => {
        if (node.type !== 'text') return node;
        return { ...node, text: op.text } as ASTNode;
      });

    // Change text formatting (bold, italic, etc.)
    case 'update-marks':
      return replaceNode(ast, op.nodeId, node => {
        if (node.type !== 'text') return node;
        return { ...node, marks: op.marks } as ASTNode;
      });

    // Change node attributes (like changing a heading from level 1 to level 2)
    case 'update-attrs':
      return replaceNode(ast, op.nodeId, node => ({ ...node, ...op.attrs } as ASTNode));

    // Move a node to a different position (drag-and-drop or cut-paste)
    case 'move-node': {
      const index = buildNodeIndex(ast);
      const entry = index.get(op.nodeId);
      if (!entry) return ast;
      const moving = entry.node;
      // First remove the node from its old position
      let updated = removeNode(ast, op.nodeId);
      // Then insert it at the new position
      updated = insertNodeAt(updated, op.newParentId, op.newIndex, moving);
      return updated;
    }

    // Split a text node into two (like when user presses Enter in the middle of text)
    case 'split-node': {
      const index = buildNodeIndex(ast);
      const entry = index.get(op.nodeId);
      if (!entry || !entry.parent || entry.node.type !== 'text') return ast;
      const orig = entry.node as ASTText;
      // Create two text nodes: before and after the split point
      const first: ASTText  = { ...orig, text: orig.text.slice(0, op.offset) };
      const second: ASTText = { nodeId: op.newNodeId, type: 'text', text: orig.text.slice(op.offset), marks: [...orig.marks] };
      // Replace the original with the first part
      let updated = replaceNode(ast, op.nodeId, () => first as ASTNode);
      // Insert the second part right after
      updated = insertNodeAt(updated, (entry.parent as ASTNode).nodeId, entry.indexInParent + 1, second as ASTNode);
      return updated;
    }

    // Merge two text nodes into one (like when user presses Backspace at start of line)
    case 'merge-node': {
      const index = buildNodeIndex(ast);
      const target = index.get(op.nodeId)?.node;
      const withNode = index.get(op.withNodeId)?.node;
      if (!target || !withNode || target.type !== 'text' || withNode.type !== 'text') return ast;
      // Combine the text from both nodes
      let updated = replaceNode(ast, op.nodeId, () => ({
        ...target, text: (target as ASTText).text + (withNode as ASTText).text,
      } as ASTNode));
      // Remove the second node since its text is now in the first
      updated = removeNode(updated, op.withNodeId);
      return updated;
    }

    default:
      return ast; // Unknown operation type - just return document unchanged
  }
}

// Apply multiple operations in sequence to a document
// Pure function - returns a new document without changing the original
export function applyOps(ast: ASTDocument, ops: ASTOperation[]): ASTDocument {
  return ops.reduce((cur, op) => applyOp(cur, op), ast);
}
