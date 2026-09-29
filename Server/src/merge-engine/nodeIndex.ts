import { ASTDocument, ASTNode } from './types';

// Information about a node's position in the document tree
export interface NodeEntry {
  node: ASTNode;              // The actual node
  parent: ASTNode | null;     // Its parent node (null for document root)
  indexInParent: number;      // Which position it's at in its parent's children
}

// A lookup map that lets us quickly find any node by its ID
export type NodeIndex = Map<string, NodeEntry>;

// Get the children of a node (if it has any)
function children(node: ASTNode): ASTNode[] {
  if ('children' in node && Array.isArray((node as { children?: unknown }).children)) {
    return (node as { children: ASTNode[] }).children;
  }
  return [];
}

// Build a complete index of all nodes in the document for fast lookup
// This is like creating a phone book - instead of searching the whole document,
// we can instantly find any node by its ID
export function buildNodeIndex(ast: ASTDocument): NodeIndex {
  const index: NodeIndex = new Map();
  
  // Visit every node in the document tree (depth-first search)
  function visit(node: ASTNode, parent: ASTNode | null, idx: number): void {
    index.set(node.nodeId, { node, parent, indexInParent: idx });
    // Recursively visit all children
    children(node).forEach((child, i) => visit(child, node, i));
  }
  
  visit(ast, null, 0);
  return index;
}

// Check if one node is nested inside another node
// Example: checking if a text node is inside a specific paragraph
export function isDescendant(nodeId: string, ancestorId: string, index: NodeIndex): boolean {
  let entry = index.get(nodeId);
  // Walk up the tree checking each parent
  while (entry?.parent) {
    const p = entry.parent as ASTNode;
    if (p.nodeId === ancestorId) return true;
    entry = index.get(p.nodeId);
  }
  return false;
}

// Replace a node in the document tree without changing the original document
// This creates a new document with only the changed node and its ancestors copied
// (structural sharing - unchanged parts are reused for efficiency)
export function replaceNode(
  ast: ASTDocument,
  targetId: string,
  replacer: (node: ASTNode) => ASTNode
): ASTDocument {
  function walk(node: ASTNode): ASTNode {
    // Found the node to replace
    if (node.nodeId === targetId) return replacer(node);
    
    const ch = children(node);
    if (ch.length === 0) return node; // Leaf node, nothing to do
    
    // Check if any children changed
    let changed = false;
    const newCh = ch.map(c => { 
      const n = walk(c); 
      if (n !== c) changed = true; 
      return n; 
    });
    
    // If no children changed, return the original node (no copy needed)
    if (!changed) return node;
    
    // Create a new node with the updated children
    return { ...node, children: newCh } as ASTNode;
  }
  
  return walk(ast) as ASTDocument;
}

// Remove a node from the document tree (immutable - returns new document)
export function removeNode(ast: ASTDocument, nodeId: string): ASTDocument {
  function walk(node: ASTNode): ASTNode {
    const ch = children(node);
    if (ch.length === 0) return node; // No children to filter
    
    // Filter out the node we want to remove
    const filtered = ch.filter(c => c.nodeId !== nodeId);
    let changed = filtered.length !== ch.length;
    
    // Recursively check all remaining children
    const newCh = filtered.map(c => { 
      const n = walk(c); 
      if (n !== c) changed = true; 
      return n; 
    });
    
    // Return original if nothing changed
    if (!changed) return node;
    
    // Create new node with updated children
    return { ...node, children: newCh } as ASTNode;
  }
  
  return walk(ast) as ASTDocument;
}

// Insert a new node at a specific position within a parent node
// Example: inserting a new paragraph at position 3 in the document
export function insertNodeAt(
  ast: ASTDocument,
  parentId: string,
  index: number,
  newNode: ASTNode
): ASTDocument {
  return replaceNode(ast, parentId, parent => {
    const ch = [...children(parent)];
    // Insert the new node at the specified index (clamped to valid range)
    ch.splice(Math.min(Math.max(0, index), ch.length), 0, newNode);
    return { ...parent, children: ch } as ASTNode;
  });
}
