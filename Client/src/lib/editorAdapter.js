import { Fragment } from 'prosemirror-model';
import { v4 as uuid } from 'uuid';
import { editorSchema } from './editorSchema';

// ─── AST → ProseMirror ────────────────────────────────────────────────────────

/** @param {import('../types/ast').ASTDocument} ast */
export function astToDoc(ast) {
  const s = editorSchema;
  const children = ast.children.map(blockToNode);
  if (children.length === 0) children.push(s.nodes.paragraph.create({ nodeId: uuid() }));
  return s.nodes.doc.create({}, children);
}

function blockToNode(block) {
  const s = editorSchema;
  switch (block.type) {
    case 'paragraph':
      return s.nodes.paragraph.create({ nodeId: block.nodeId }, inlines(block.children));
    case 'heading':
      return s.nodes.heading.create({ nodeId: block.nodeId, level: block.level }, inlines(block.children));
    case 'list':
      return (block.ordered ? s.nodes.ordered_list : s.nodes.bullet_list).create(
        { nodeId: block.nodeId },
        Fragment.fromArray(block.children.map((li) =>
          s.nodes.list_item.create({ nodeId: li.nodeId },
            Fragment.fromArray([s.nodes.paragraph.create({ nodeId: uuid() }, inlines(li.children))]))
        ))
      );
    case 'list-item':
      return s.nodes.list_item.create({ nodeId: block.nodeId },
        Fragment.fromArray([s.nodes.paragraph.create({ nodeId: uuid() }, inlines(block.children))]));
    case 'blockquote':
      return s.nodes.blockquote.create({ nodeId: block.nodeId },
        Fragment.fromArray(block.children.map(blockToNode)));
    case 'code-block':
      return s.nodes.code_block.create({ nodeId: block.nodeId, language: block.language },
        block.children.length ? s.text(block.children.map((t) => t.text).join('')) : Fragment.empty);
    default:
      return s.nodes.paragraph.create({ nodeId: uuid() });
  }
}

function inlines(nodes) {
  if (!nodes || nodes.length === 0) return Fragment.empty;
  const pmNodes = nodes.flatMap((n) => {
    if (n.type === 'text') {
      if (!n.text) return [];
      const marks = n.marks
        .map((m) => editorSchema.marks[m]?.create())
        .filter(Boolean);
      return [editorSchema.text(n.text, marks)];
    }
    if (n.type === 'link') {
      const mark = editorSchema.marks.link.create({ href: n.href });
      const txt = n.children.map((t) => t.text).join('') || n.href;
      return [editorSchema.text(txt, [mark])];
    }
    return [];
  });
  return pmNodes.length ? Fragment.fromArray(pmNodes) : Fragment.empty;
}

// ─── ProseMirror → AST ────────────────────────────────────────────────────────

/** @param {import('prosemirror-model').Node} doc @param {string} rootNodeId */
export function docToAst(doc, rootNodeId) {
  const children = [];
  doc.forEach((node) => { const b = nodeToBlock(node); if (b) children.push(b); });
  return { nodeId: rootNodeId, type: 'document', children };
}

function nodeToBlock(node) {
  const nid = node.attrs?.nodeId || uuid();
  switch (node.type.name) {
    case 'paragraph':
      return { nodeId: nid, type: 'paragraph', children: fragToInlines(node) };
    case 'heading':
      return { nodeId: nid, type: 'heading', level: node.attrs.level, children: fragToInlines(node) };
    case 'bullet_list':
    case 'ordered_list': {
      const items = [];
      node.forEach((li) => {
        const liId = li.attrs?.nodeId || uuid();
        const ilines = [];
        li.forEach((ch) => { if (ch.type.name === 'paragraph') ilines.push(...fragToInlines(ch)); });
        items.push({ nodeId: liId, type: 'list-item', children: ilines });
      });
      return { nodeId: nid, type: 'list', ordered: node.type.name === 'ordered_list', children: items };
    }
    case 'blockquote': {
      const ch = [];
      node.forEach((c) => { const b = nodeToBlock(c); if (b) ch.push(b); });
      return { nodeId: nid, type: 'blockquote', children: ch };
    }
    case 'code_block':
      return { nodeId: nid, type: 'code-block', language: node.attrs.language || '',
               children: [{ nodeId: uuid(), type: 'text', text: node.textContent, marks: [] }] };
    default: return null;
  }
}

function fragToInlines(node) {
  const result = [];
  node.forEach((ch) => {
    if (ch.isText) {
      const marks = ch.marks
        .map((m) => m.type.name)
        .filter((m) => ['bold','italic','underline','code','strikethrough'].includes(m));
      result.push({ nodeId: uuid(), type: 'text', text: ch.text ?? '', marks });
    }
  });
  return result.length ? result : [{ nodeId: uuid(), type: 'text', text: '', marks: [] }];
}

// ─── Transaction → ASTOperations ─────────────────────────────────────────────

/**
 * Diff prev and next AST to produce ASTOperation[].
 * Uses a snapshot-diff approach: compare block children by nodeId,
 * emit insert/delete/update-text/update-marks for changes.
 * @param {import('prosemirror-state').Transaction} tr
 * @param {import('prosemirror-state').EditorState} prevState
 * @param {string} rootNodeId
 * @returns {import('../types/ast').ASTOperation[]}
 */
export function transactionToOps(tr, prevState, rootNodeId) {
  if (!tr.docChanged) return [];
  const prev = docToAst(prevState.doc, rootNodeId);
  const next = docToAst(tr.doc, rootNodeId);
  return diffAsts(prev, next);
}

function diffAsts(prev, next) {
  const ops = [];
  const prevMap = new Map(prev.children.map((b) => [b.nodeId, b]));
  const nextMap = new Map(next.children.map((b) => [b.nodeId, b]));

  // Deleted blocks
  for (const [id] of prevMap) {
    if (!nextMap.has(id)) ops.push({ op: 'delete-node', nodeId: id });
  }

  // Inserted or updated blocks
  next.children.forEach((block, index) => {
    if (!prevMap.has(block.nodeId)) {
      ops.push({ op: 'insert-node', parentId: next.nodeId, index, node: block });
    } else {
      ops.push(...diffBlocks(prevMap.get(block.nodeId), block));
    }
  });

  return ops;
}

function diffBlocks(prev, next) {
  const ops = [];
  if (prev.type === 'heading' && next.type === 'heading' && prev.level !== next.level)
    ops.push({ op: 'update-attrs', nodeId: next.nodeId, attrs: { level: next.level } });

  const pc = prev.children || [];
  const nc = next.children || [];
  ops.push(...diffInlines(pc, nc, next.nodeId));
  return ops;
}

function diffInlines(prev, next, parentId) {
  const ops = [];
  const prevMap = new Map(prev.map((n) => [n.nodeId, n]));
  const nextMap = new Map(next.map((n) => [n.nodeId, n]));

  for (const [id] of prevMap) {
    if (!nextMap.has(id)) ops.push({ op: 'delete-node', nodeId: id });
  }

  next.forEach((node, i) => {
    if (!prevMap.has(node.nodeId)) {
      ops.push({ op: 'insert-node', parentId, index: i, node });
    } else {
      const p = prevMap.get(node.nodeId);
      if (p.type === 'text' && node.type === 'text') {
        if (p.text !== node.text) ops.push({ op: 'update-text', nodeId: node.nodeId, text: node.text });
        if (JSON.stringify(p.marks) !== JSON.stringify(node.marks))
          ops.push({ op: 'update-marks', nodeId: node.nodeId, marks: node.marks });
      }
    }
  });

  return ops;
}
