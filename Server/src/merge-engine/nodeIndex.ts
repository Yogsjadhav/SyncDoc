import { ASTDocument, ASTNode } from './types';

export interface NodeEntry {
  node: ASTNode;
  parent: ASTNode | null;
  indexInParent: number;
}

export type NodeIndex = Map<string, NodeEntry>;

function children(node: ASTNode): ASTNode[] {
  if ('children' in node && Array.isArray((node as { children?: unknown }).children)) {
    return (node as { children: ASTNode[] }).children;
  }
  return [];
}

/** Single DFS pass — O(n). Returns a Map<nodeId, NodeEntry>. */
export function buildNodeIndex(ast: ASTDocument): NodeIndex {
  const index: NodeIndex = new Map();
  function visit(node: ASTNode, parent: ASTNode | null, idx: number): void {
    index.set(node.nodeId, { node, parent, indexInParent: idx });
    children(node).forEach((child, i) => visit(child, node, i));
  }
  visit(ast, null, 0);
  return index;
}

/** True if nodeId is a strict descendant of ancestorId in the given index. */
export function isDescendant(nodeId: string, ancestorId: string, index: NodeIndex): boolean {
  let entry = index.get(nodeId);
  while (entry?.parent) {
    const p = entry.parent as ASTNode;
    if (p.nodeId === ancestorId) return true;
    entry = index.get(p.nodeId);
  }
  return false;
}

/**
 * Immutable path-clone: walk the tree; when we reach targetId, call replacer.
 * Every node on the path to targetId is shallow-cloned; all other nodes are
 * shared by reference (structural sharing).
 */
export function replaceNode(
  ast: ASTDocument,
  targetId: string,
  replacer: (node: ASTNode) => ASTNode
): ASTDocument {
  function walk(node: ASTNode): ASTNode {
    if (node.nodeId === targetId) return replacer(node);
    const ch = children(node);
    if (ch.length === 0) return node;
    let changed = false;
    const newCh = ch.map(c => { const n = walk(c); if (n !== c) changed = true; return n; });
    if (!changed) return node;
    return { ...node, children: newCh } as ASTNode;
  }
  return walk(ast) as ASTDocument;
}

/** Remove nodeId from wherever it lives in the tree (immutable). */
export function removeNode(ast: ASTDocument, nodeId: string): ASTDocument {
  function walk(node: ASTNode): ASTNode {
    const ch = children(node);
    if (ch.length === 0) return node;
    const filtered = ch.filter(c => c.nodeId !== nodeId);
    let changed = filtered.length !== ch.length;
    const newCh = filtered.map(c => { const n = walk(c); if (n !== c) changed = true; return n; });
    if (!changed) return node;
    return { ...node, children: newCh } as ASTNode;
  }
  return walk(ast) as ASTDocument;
}

/** Insert newNode at index inside the node with id parentId (immutable). */
export function insertNodeAt(
  ast: ASTDocument,
  parentId: string,
  index: number,
  newNode: ASTNode
): ASTDocument {
  return replaceNode(ast, parentId, parent => {
    const ch = [...children(parent)];
    ch.splice(Math.min(Math.max(0, index), ch.length), 0, newNode);
    return { ...parent, children: ch } as ASTNode;
  });
}
