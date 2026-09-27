import { useState } from 'react';
import { toggleMark, setBlockType, wrapIn } from 'prosemirror-commands';
import { wrapInList, liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { undo, redo } from 'prosemirror-history';
import { editorSchema } from '../../lib/editorSchema';
import ToolbarButton from './ToolbarButton';

const s = editorSchema;

// ── Command helpers ────────────────────────────────────────────────────────────
const cmd = (command, view) => {
  command(view.state, view.dispatch, view);
  view.focus();
};

const isMarkActive = (view, markType) => {
  if (!view) return false;
  const { from, $from, to, empty } = view.state.selection;
  if (empty) return !!markType.isInSet(view.state.storedMarks || $from.marks());
  return view.state.doc.rangeHasMark(from, to, markType);
};

const isBlockType = (view, nodeType, attrs = {}) => {
  if (!view) return false;
  const { $from, to } = view.state.selection;
  return to <= $from.end() && $from.parent.hasMarkup(nodeType, attrs);
};

// ── Button definitions ────────────────────────────────────────────────────────
function getButtons(view) {
  return [
    // History
    { label: 'Undo', group: 'history', icon: '↩', action: () => cmd(undo, view) },
    { label: 'Redo', group: 'history', icon: '↪', action: () => cmd(redo, view) },
    // Marks
    { label: 'Bold',           group: 'marks', icon: <strong>B</strong>,
      active: isMarkActive(view, s.marks.bold),
      action: () => cmd(toggleMark(s.marks.bold), view) },
    { label: 'Italic',         group: 'marks', icon: <em>I</em>,
      active: isMarkActive(view, s.marks.italic),
      action: () => cmd(toggleMark(s.marks.italic), view) },
    { label: 'Underline',      group: 'marks', icon: <span className="underline">U</span>,
      active: isMarkActive(view, s.marks.underline),
      action: () => cmd(toggleMark(s.marks.underline), view) },
    { label: 'Strikethrough',  group: 'marks', icon: <span className="line-through">S</span>,
      active: isMarkActive(view, s.marks.strikethrough),
      action: () => cmd(toggleMark(s.marks.strikethrough), view) },
    { label: 'Inline code',    group: 'marks', icon: <code className="font-mono text-xs">{'<>'}</code>,
      active: isMarkActive(view, s.marks.code),
      action: () => cmd(toggleMark(s.marks.code), view) },
    // Block types
    { label: 'Paragraph',      group: 'blocks', icon: 'P',
      active: isBlockType(view, s.nodes.paragraph),
      action: () => cmd(setBlockType(s.nodes.paragraph), view) },
    { label: 'Heading 1',      group: 'blocks', icon: 'H1',
      active: isBlockType(view, s.nodes.heading, { level: 1 }),
      action: () => cmd(setBlockType(s.nodes.heading, { level: 1 }), view) },
    { label: 'Heading 2',      group: 'blocks', icon: 'H2',
      active: isBlockType(view, s.nodes.heading, { level: 2 }),
      action: () => cmd(setBlockType(s.nodes.heading, { level: 2 }), view) },
    { label: 'Heading 3',      group: 'blocks', icon: 'H3',
      active: isBlockType(view, s.nodes.heading, { level: 3 }),
      action: () => cmd(setBlockType(s.nodes.heading, { level: 3 }), view) },
    // Lists
    { label: 'Bullet list',    group: 'lists', icon: '•≡',
      action: () => cmd(wrapInList(s.nodes.bullet_list), view) },
    { label: 'Ordered list',   group: 'lists', icon: '1≡',
      action: () => cmd(wrapInList(s.nodes.ordered_list), view) },
    { label: 'Outdent',        group: 'lists', icon: '⇤',
      action: () => cmd(liftListItem(s.nodes.list_item), view) },
    { label: 'Indent',         group: 'lists', icon: '⇥',
      action: () => cmd(sinkListItem(s.nodes.list_item), view) },
    // Blocks
    { label: 'Blockquote',     group: 'blocks2', icon: '❝',
      action: () => cmd(wrapIn(s.nodes.blockquote), view) },
    { label: 'Code block',     group: 'blocks2', icon: '{ }',
      active: isBlockType(view, s.nodes.code_block),
      action: () => cmd(setBlockType(s.nodes.code_block), view) },
  ];
}

const ALWAYS_VISIBLE = 4; // how many buttons are always shown on mobile

export default function Toolbar({ view, readOnly }) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  if (readOnly) return null;

  const buttons = getButtons(view);

  return (
    <div className="flex items-center gap-0.5 border-b border-gray-200 bg-white px-2 py-1.5 flex-wrap">
      {/* Always-visible buttons */}
      <div className="flex items-center gap-0.5">
        {buttons.map((btn, i) => (
          <span key={btn.label} className={i >= ALWAYS_VISIBLE ? 'hidden sm:inline-flex' : ''}>
            {i > 0 && btn.group !== buttons[i - 1].group && (
              <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden="true" />
            )}
            <ToolbarButton
              label={btn.label}
              active={btn.active}
              onClick={btn.action}
              disabled={!view}
            >
              <span className="text-xs font-medium leading-none">{btn.icon}</span>
            </ToolbarButton>
          </span>
        ))}
      </div>

      {/* Overflow "more" menu for mobile */}
      <div className="relative ml-auto sm:hidden">
        <ToolbarButton label="More formatting options" onClick={() => setOverflowOpen((o) => !o)}>
          <span className="text-xs font-bold">···</span>
        </ToolbarButton>
        {overflowOpen && (
          <div className="absolute right-0 top-9 z-30 w-44 rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
            {buttons.slice(ALWAYS_VISIBLE).map((btn) => (
              <button key={btn.label} type="button"
                onMouseDown={(e) => { e.preventDefault(); btn.action(); setOverflowOpen(false); }}
                className={`menu-item flex items-center gap-2 ${btn.active ? 'text-brand-600 bg-brand-50' : ''}`}>
                <span className="w-5 text-center text-xs">{btn.icon}</span>
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
