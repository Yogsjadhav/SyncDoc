import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { buildInputRules } from '../../lib/editorInputRules';
import { editorSchema } from '../../lib/editorSchema';
import { astToDoc, docToAst, transactionToOps } from '../../lib/editorAdapter';
import { useDocumentStore } from '../../store/documentStore';

/**
 * Mounts a ProseMirror editor wired to the document AST in the store.
 * Exposes `getView()` via ref so parent components can read the view for presence.
 *
 * Props:
 *   onOps(ops[])  — called with ASTOperations whenever the doc changes
 *   readOnly      — render without editing (history preview)
 *   ast           — override AST (for read-only preview mode)
 */
const Editor = forwardRef(function Editor({ onOps, readOnly = false, ast: propAst }, ref) {
  const mountRef = useRef(null);
  const viewRef  = useRef(null);
  const storeAst = useDocumentStore((s) => s.ast);
  const docId    = useDocumentStore((s) => s.document?._id ?? 'doc-root');
  const activeAst = propAst ?? storeAst;
  const lastAstRef = useRef(null);

  useImperativeHandle(ref, () => ({ getView: () => viewRef.current }));

  // ── Mount ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current || !activeAst) return;

    const state = EditorState.create({
      doc: astToDoc(activeAst),
      plugins: [
        history(),
        keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
        keymap(baseKeymap),
        buildInputRules(),
      ],
    });

    const view = new EditorView(mountRef.current, {
      state,
      editable: () => !readOnly,
      dispatchTransaction(tr) {
        const prevState = view.state;
        view.updateState(view.state.apply(tr));
        if (tr.docChanged && !readOnly && !tr.getMeta('remote')) {
          const ops = transactionToOps(tr, prevState, docId);
          if (ops.length > 0 && onOps) onOps(ops);
        }
      },
    });

    viewRef.current = view;
    lastAstRef.current = activeAst;

    return () => { view.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!activeAst, docId, readOnly]);

  // ── Apply remote AST updates ─────────────────────────────────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !activeAst || activeAst === lastAstRef.current) return;
    const pmDoc = astToDoc(activeAst);
    const tr = view.state.tr
      .replaceWith(0, view.state.doc.content.size, pmDoc.content)
      .setMeta('remote', true);
    view.dispatch(tr);
    lastAstRef.current = activeAst;
  }, [activeAst]);

  return (
    <div
      ref={mountRef}
      className="min-h-[60vh] px-1 focus:outline-none"
      aria-label="Document editor"
      aria-multiline="true"
      role="textbox"
    />
  );
});

export default Editor;
