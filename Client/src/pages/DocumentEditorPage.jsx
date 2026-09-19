import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useDocumentStore } from '../store/documentStore';
import { useSocket } from '../hooks/useSocket';
import { useDocument } from '../hooks/useDocument';
import { usePresence } from '../hooks/usePresence';
import Editor from '../components/editor/Editor';
import Toolbar from '../components/editor/Toolbar';
import PresenceBar from '../components/editor/PresenceBar';
import CursorOverlay from '../components/editor/CursorOverlay';
import ConflictBanner from '../components/editor/ConflictBanner';
import HistoryPanel from '../components/history/HistoryPanel';
import ShareModal from '../components/dashboard/ShareModal';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import apiClient from '../lib/apiClient';

export default function DocumentEditorPage() {
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const document = useDocumentStore((s) => s.document);
  const role     = useDocumentStore((s) => s.role);
  const { pushLocalOp, reset } = useDocumentStore();

  const editorRef = useRef(null);
  const [view, setView] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [titleEditing, setTitleEditing] = useState(false);

  // Real-time layer
  const { submitOp, emitPresence } = useSocket(documentId);
  const { scheduleFlush } = useDocument(documentId, submitOp);
  usePresence(view, emitPresence);

  // Sync title draft from store
  useEffect(() => {
    if (document?.title) setTitleDraft(document.title);
  }, [document?.title]);

  // Cleanup store on unmount
  useEffect(() => () => reset(), [reset]);

  // Get ProseMirror view after editor mounts
  useEffect(() => {
    const interval = setInterval(() => {
      const v = editorRef.current?.getView();
      if (v) { setView(v); clearInterval(interval); }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleOps = useCallback((ops) => {
    ops.forEach((op) => pushLocalOp(op));
    scheduleFlush();
  }, [pushLocalOp, scheduleFlush]);

  const handleRenameBlur = async () => {
    setTitleEditing(false);
    if (!titleDraft.trim() || titleDraft === document?.title) return;
    try {
      await apiClient.patch(`/api/documents/${documentId}`, { title: titleDraft.trim() });
    } catch { /* ignore */ }
  };

  const isReadOnly = role === 'viewer';

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-3 py-2 sm:px-4">
        {/* Left: back + title */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button onClick={() => navigate('/dashboard')} aria-label="Back to dashboard"
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </button>

          {titleEditing && !isReadOnly ? (
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleRenameBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setTitleDraft(document?.title || ''); setTitleEditing(false); } }}
              className="min-w-0 flex-1 rounded border border-brand-400 px-2 py-1 text-sm font-semibold
                focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label="Document title"
              autoFocus
            />
          ) : (
            <h1
              className={`min-w-0 flex-1 truncate text-sm font-semibold text-gray-800 ${!isReadOnly ? 'cursor-pointer hover:text-brand-600' : ''}`}
              onClick={() => !isReadOnly && setTitleEditing(true)}
              title={document?.title}
            >
              {document?.title || 'Loading…'}
              {isReadOnly && <span className="ml-2 text-xs font-normal text-gray-400">(viewer)</span>}
            </h1>
          )}
        </div>

        {/* Right: presence + actions */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <PresenceBar />

          {/* History */}
          <button onClick={() => setHistoryOpen(true)} aria-label="Version history"
            className="hidden rounded-lg p-1.5 text-gray-500 hover:bg-gray-100
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:block">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </button>

          {/* Share */}
          {role === 'owner' && (
            <Button size="sm" variant="secondary" onClick={() => setShareOpen(true)}>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
              <span className="hidden sm:inline">Share</span>
            </Button>
          )}

          {user && <Avatar name={user.name} color={user.avatarColor} size="sm" title={user.name} />}

          <button onClick={() => setHistoryOpen(true)} aria-label="Version history"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:hidden">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <Toolbar view={view} readOnly={isReadOnly} />

      {/* ── Conflict banners ──────────────────────────────────────────────── */}
      <ConflictBanner />

      {/* ── Editor surface ────────────────────────────────────────────────── */}
      <main className="relative flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
          <Editor ref={editorRef} onOps={handleOps} readOnly={isReadOnly} />
          <CursorOverlay view={view} />
        </div>
      </main>

      {/* ── Panels / Modals ───────────────────────────────────────────────── */}
      <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} documentId={documentId} />

      {shareOpen && document && (
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          documentId={documentId}
          documentTitle={document.title}
          collaborators={document.collaborators || []}
          onUpdated={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
