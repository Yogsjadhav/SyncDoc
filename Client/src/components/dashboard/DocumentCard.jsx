import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function relTime(iso) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DocumentCard({ doc, currentUserId, onRename, onDelete, onDuplicate, onShare }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(doc.title);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const isOwner = doc.ownerId === currentUserId;

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  useEffect(() => { if (renaming) inputRef.current?.focus(); }, [renaming]);

  const commitRename = () => {
    if (draft.trim() && draft !== doc.title) onRename(doc._id, draft.trim());
    else setDraft(doc.title);
    setRenaming(false);
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Icon */}
      <div
        className="mb-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-brand-50 text-brand-600"
        onClick={() => navigate(`/doc/${doc._id}`)}
        role="button" tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigate(`/doc/${doc._id}`)}
        aria-label={`Open ${doc.title}`}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      {/* Title */}
      {renaming ? (
        <input ref={inputRef} value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setDraft(doc.title); setRenaming(false); } }}
          className="mb-1 w-full rounded border border-brand-400 px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label="Rename document" />
      ) : (
        <h3 className="mb-1 cursor-pointer truncate text-sm font-semibold text-gray-900 hover:text-brand-600"
          onClick={() => navigate(`/doc/${doc._id}`)} title={doc.title}>
          {doc.title}
        </h3>
      )}
      <p className="text-xs text-gray-400">Edited {relTime(doc.updatedAt)}</p>

      {/* Context menu */}
      <div className="absolute right-3 top-3" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
          className="rounded-lg p-1.5 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100
            hover:text-gray-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label="Document options" aria-haspopup="true" aria-expanded={menuOpen}
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
        {menuOpen && (
          <div role="menu" className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
            <button role="menuitem" className="menu-item" onClick={() => { navigate(`/doc/${doc._id}`); setMenuOpen(false); }}>Open</button>
            {isOwner && <button role="menuitem" className="menu-item" onClick={() => { setRenaming(true); setMenuOpen(false); }}>Rename</button>}
            <button role="menuitem" className="menu-item" onClick={() => { onDuplicate(doc._id); setMenuOpen(false); }}>Duplicate</button>
            {isOwner && <button role="menuitem" className="menu-item" onClick={() => { onShare(doc); setMenuOpen(false); }}>Share</button>}
            {isOwner && <button role="menuitem" className="menu-item text-red-600 hover:bg-red-50" onClick={() => { onDelete(doc); setMenuOpen(false); }}>Delete</button>}
          </div>
        )}
      </div>
    </div>
  );
}
