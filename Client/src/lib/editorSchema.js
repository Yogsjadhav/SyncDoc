import { Schema } from 'prosemirror-model';

/**
 * ProseMirror schema that maps 1-to-1 with the SyncDoc AST.
 * Every node carries a `nodeId` attribute so the adapter can
 * translate between PM docs and SyncDoc ASTs bidirectionally.
 */

const nodeId = { nodeId: { default: '' } };

export const editorSchema = new Schema({
  nodes: {
    doc:          { content: 'block+' },

    paragraph:    { group: 'block', content: 'inline*',
                    attrs: nodeId, parseDOM: [{ tag: 'p' }],
                    toDOM: () => ['p', 0] },

    heading:      { group: 'block', content: 'inline*', defining: true,
                    attrs: { ...nodeId, level: { default: 1 } },
                    parseDOM: [1,2,3,4,5,6].map(i => ({ tag: `h${i}`, attrs: { level: i } })),
                    toDOM: (node) => [`h${node.attrs.level}`, 0] },

    bullet_list:  { group: 'block', content: 'list_item+',
                    attrs: nodeId, parseDOM: [{ tag: 'ul' }],
                    toDOM: () => ['ul', 0] },

    ordered_list: { group: 'block', content: 'list_item+',
                    attrs: nodeId, parseDOM: [{ tag: 'ol' }],
                    toDOM: () => ['ol', 0] },

    list_item:    { content: 'paragraph block*', defining: true,
                    attrs: nodeId, parseDOM: [{ tag: 'li' }],
                    toDOM: () => ['li', 0] },

    blockquote:   { group: 'block', content: 'block+', defining: true,
                    attrs: nodeId, parseDOM: [{ tag: 'blockquote' }],
                    toDOM: () => ['blockquote', 0] },

    code_block:   { group: 'block', content: 'text*', code: true, defining: true,
                    attrs: { ...nodeId, language: { default: '' } },
                    parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
                    toDOM: () => ['pre', ['code', 0]] },

    text:         { group: 'inline' },

    hard_break:   { group: 'inline', inline: true, selectable: false,
                    parseDOM: [{ tag: 'br' }], toDOM: () => ['br'] },
  },

  marks: {
    bold:          { parseDOM: [{ tag: 'strong' }, { tag: 'b' }], toDOM: () => ['strong', 0] },
    italic:        { parseDOM: [{ tag: 'em' }, { tag: 'i' }],     toDOM: () => ['em', 0] },
    underline:     { parseDOM: [{ tag: 'u' }],                    toDOM: () => ['u', 0] },
    code:          { parseDOM: [{ tag: 'code' }],                 toDOM: () => ['code', 0] },
    strikethrough: { parseDOM: [{ tag: 's' }, { tag: 'del' }],    toDOM: () => ['s', 0] },
    link: {
      attrs: { href: {}, title: { default: null } },
      inclusive: false,
      parseDOM: [{ tag: 'a[href]', getAttrs: (dom) => ({ href: dom.getAttribute('href'), title: dom.getAttribute('title') }) }],
      toDOM: (node) => ['a', { href: node.attrs.href, title: node.attrs.title }, 0],
    },
  },
});
