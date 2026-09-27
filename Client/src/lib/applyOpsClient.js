/**
 * Client-side copy of the merge engine's applyOp / applyOps.
 * Pure functions — no imports from the server.
 * Used to apply incoming op-broadcast ops to the local AST.
 */

// ─── Node index helpers ───────────────────────────────────────────────────────
function children(node) {
  return Array.isArray(node?.children) ? node.children : [];
}

function replaceNode(ast, targetId, replacer) {
  function walk(node) {
    if (node.nodeId === targetId) return replacer(node);
    const ch = children(node);
    if (!ch.length) return node;
    let changed = false;
    const newCh = ch.map((c) => { const n = walk(c); if (n !== c) changed = true; return n; });
    return changed ? { ...node, children: newCh } : node;
  }
  return walk(ast);
}

function removeNode(ast, nodeId) {
  function walk(node) {
    const ch = children(node);
    if (!ch.length) return node;
    const filtered = ch.filter((c) => c.nodeId !== nodeId);
    let changed = filtered.length !== ch.length;
    const newCh = filtered.map((c) => { const n = walk(c); if (n !== c) changed = true; return n; });
    return changed ? { ...node, children: newCh } : node;
  }
  return walk(ast);
}

function insertNodeAt(ast, parentId, index, newNode) {
  return replaceNode(ast, parentId, (parent) => {
    const ch = [...children(parent)];
    ch.splice(Math.min(Math.max(0, index), ch.length), 0, newNode);
    return { ...parent, children: ch };
  });
}

function findNode(ast, nodeId) {
  if (ast.nodeId === nodeId) return ast;
  for (const ch of children(ast)) {
    const found = findNode(ch, nodeId);
    if (found) return found;
  }
  return null;
}

function findParentAndIndex(ast, nodeId) {
  function walk(node, parent, idx) {
    if (node.nodeId === nodeId) return { parent, idx };
    for (let i = 0; i < children(node).length; i++) {
      const result = walk(children(node)[i], node, i);
      if (result) return result;
    }
    return null;
  }
  return walk(ast, null, 0);
}

// ─── applyOp ─────────────────────────────────────────────────────────────────
export function applyOp(ast, op) {
  switch (op.op) {
    case 'insert-node':
      return insertNodeAt(ast, op.parentId, op.index, op.node);

    case 'delete-node':
      return removeNode(ast, op.nodeId);

    case 'update-text':
      return replaceNode(ast, op.nodeId, (n) => n.type === 'text' ? { ...n, text: op.text } : n);

    case 'update-marks':
      return replaceNode(ast, op.nodeId, (n) => n.type === 'text' ? { ...n, marks: op.marks } : n);

    case 'update-attrs':
      return replaceNode(ast, op.nodeId, (n) => ({ ...n, ...op.attrs }));

    case 'move-node': {
      const node = findNode(ast, op.nodeId);
      if (!node) return ast;
      let updated = removeNode(ast, op.nodeId);
      return insertNodeAt(updated, op.newParentId, op.newIndex, node);
    }

    case 'split-node': {
      const node = findNode(ast, op.nodeId);
      const pi = findParentAndIndex(ast, op.nodeId);
      if (!node || node.type !== 'text' || !pi.parent) return ast;
      const first  = { ...node, text: node.text.slice(0, op.offset) };
      const second = { nodeId: op.newNodeId, type: 'text', text: node.text.slice(op.offset), marks: [...node.marks] };
      let updated = replaceNode(ast, op.nodeId, () => first);
      return insertNodeAt(updated, pi.parent.nodeId, pi.idx + 1, second);
    }

    case 'merge-node': {
      const target = findNode(ast, op.nodeId);
      const with_  = findNode(ast, op.withNodeId);
      if (!target || !with_ || target.type !== 'text' || with_.type !== 'text') return ast;
      let updated = replaceNode(ast, op.nodeId, () => ({ ...target, text: target.text + with_.text }));
      return removeNode(updated, op.withNodeId);
    }

    default: return ast;
  }
}

export function applyOps(ast, ops) {
  return ops.reduce((cur, op) => applyOp(cur, op), ast);
}
