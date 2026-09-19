import { useEffect, useRef } from 'react';

const DEBOUNCE_MS = 50;

/**
 * Watches ProseMirror selection changes and debounces presence-update emissions.
 * @param {import('prosemirror-view').EditorView|null} view
 * @param {(cursor, selection) => void} emitPresence
 */
export function usePresence(view, emitPresence) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!view) return;

    const handler = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const { from, to } = view.state.selection;
        emitPresence({ pos: from }, { anchor: from, head: to });
      }, DEBOUNCE_MS);
    };

    // ProseMirror fires 'selectionchange' on the DOM element
    view.dom.addEventListener('keyup', handler);
    view.dom.addEventListener('mouseup', handler);
    view.dom.addEventListener('click', handler);

    return () => {
      view.dom.removeEventListener('keyup', handler);
      view.dom.removeEventListener('mouseup', handler);
      view.dom.removeEventListener('click', handler);
      clearTimeout(timerRef.current);
    };
  }, [view, emitPresence]);
}
