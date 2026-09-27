import { useEffect } from 'react';
import { useDocumentStore } from '../../store/documentStore';
import { useAuthStore } from '../../store/authStore';

/**
 * Renders remote cursors as colored carets inside the ProseMirror editor.
 * Uses ProseMirror decorations injected via a plugin — here we use a simpler
 * approach: position absolutely using the editor's coordsAtPos API.
 */
export default function CursorOverlay({ view }) {
  const presence = useDocumentStore((s) => s.presence);
  const currentUserId = useAuthStore((s) => s.user?._id);

  useEffect(() => {
    if (!view) return;
    // Force a re-render whenever presence changes
  }, [presence, view]);

  if (!view) return null;

  const others = Array.from(presence.values()).filter(
    (u) => u.userId !== currentUserId && u.cursor
  );

  return (
    <>
      {others.map((u) => {
        try {
          const pos = Math.min(u.cursor.pos, view.state.doc.content.size);
          const coords = view.coordsAtPos(pos);
          const editorRect = view.dom.getBoundingClientRect();
          const top  = coords.top  - editorRect.top;
          const left = coords.left - editorRect.left;

          return (
            <div key={u.userId}
              className="remote-cursor pointer-events-none absolute"
              style={{ top, left, borderColor: u.avatarColor, height: coords.bottom - coords.top }}
              aria-hidden="true"
            >
              <div className="remote-cursor-label" style={{ backgroundColor: u.avatarColor }}>
                {u.name}
              </div>
            </div>
          );
        } catch {
          return null;
        }
      })}
    </>
  );
}
