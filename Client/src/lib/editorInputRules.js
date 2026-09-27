import { inputRules, wrappingInputRule, textblockTypeInputRule } from 'prosemirror-inputrules';
import { editorSchema } from './editorSchema';

/** Markdown-style input rules: ##, *, 1., >, ``` */
export function buildInputRules() {
  const s = editorSchema;
  return inputRules({ rules: [
    // Headings: # to ######
    textblockTypeInputRule(/^(#{1,6})\s$/, s.nodes.heading,
      (match) => ({ level: match[1].length })),
    // Unordered list: * or -
    wrappingInputRule(/^\s*([-*])\s$/, s.nodes.bullet_list),
    // Ordered list: 1.
    wrappingInputRule(/^(\d+)\.\s$/, s.nodes.ordered_list),
    // Blockquote: >
    wrappingInputRule(/^\s*>\s$/, s.nodes.blockquote),
    // Code block: ```
    textblockTypeInputRule(/^```(\w*)$/, s.nodes.code_block,
      (match) => ({ language: match[1] || '' })),
  ]});
}
