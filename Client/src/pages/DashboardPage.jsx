import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useDocuments } from '../hooks';
import DocumentCard from '../components/dashboard/DocumentCard';
import ShareModal from '../components/dashboard/ShareModal';
import ConfirmDeleteModal from '../components/dashboard/ConfirmDeleteModal';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';

/**
 * DashboardPage Component
 * 
 * UI Layer: Main dashboard showing document list
 * Uses: useAuth, useDocuments hooks (Hooks Layer)
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { 
    documents, 
    loading, 
    fetchDocuments, 
    createDocument, 
    updateDocument, 
    deleteDocument: deleteDoc, 
    duplicateDocument 
  } = useDocuments();

  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [shareDoc, setShareDoc] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleCreate = async () => {
    setCreating(true);
    const result = await createDocument({ title: 'Untitled' });
    setCreating(false);
    
    if (result.success) {
      navigate(`/doc/${result.document._id}`);
    }
  };

  const handleRename = async (id, title) => {
    await updateDocument(id, { title });
  };

  const handleDuplicate = async (id) => {
    await duplicateDocument(id);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteDoc(deleteTarget._id);
    setDeleting(false);
    setDeleteTarget(null);
  };

  const handleLogout = () => {
    logout();
  };

  // Filter documents
  const filtered = documents.filter((d) => 
    d.title.toLowerCase().includes(search.toLowerCase())
  );
  const myDocs = filtered.filter((d) => d.ownerId === user?._id);
  const sharedDocs = filtered.filter((d) => d.ownerId !== user?._id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="text-lg font-bold text-brand-600">SyncDoc</span>
          <div className="flex items-center gap-3">
            {user && <Avatar name={user.name} color={user.avatarColor} size="sm" />}
            <Button variant="ghost" size="sm" onClick={handleLogout}>Log out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Search + New */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input 
            type="search" 
            placeholder="Search documents…" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm
              focus:outline-none focus:ring-2 focus:ring-brand-500 sm:max-w-xs"
            aria-label="Search documents" 
          />
          <Button onClick={handleCreate} loading={creating}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New document
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* My Documents */}
            <section className="mb-10">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                My Documents {myDocs.length > 0 && `(${myDocs.length})`}
              </h2>
              {myDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
                  <p className="mb-3 text-gray-400">No documents yet</p>
                  <Button onClick={handleCreate} loading={creating} size="sm">
                    Create your first document
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {myDocs.map((d) => (
                    <DocumentCard 
                      key={d._id} 
                      doc={d} 
                      currentUserId={user?._id}
                      onRename={handleRename} 
                      onDelete={setDeleteTarget}
                      onDuplicate={handleDuplicate} 
                      onShare={setShareDoc} 
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Shared with me */}
            {sharedDocs.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Shared with me ({sharedDocs.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {sharedDocs.map((d) => (
                    <DocumentCard 
                      key={d._id} 
                      doc={d} 
                      currentUserId={user?._id}
                      onRename={handleRename} 
                      onDelete={setDeleteTarget}
                      onDuplicate={handleDuplicate} 
                      onShare={setShareDoc} 
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {shareDoc && (
        <ShareModal 
          open={!!shareDoc} 
          onClose={() => setShareDoc(null)}
          documentId={shareDoc._id} 
          documentTitle={shareDoc.title}
          collaborators={shareDoc.collaborators || []}
          onUpdated={() => { fetchDocuments(); setShareDoc(null); }} 
        />
      )}
      <ConfirmDeleteModal 
        open={!!deleteTarget} 
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} 
        title={deleteTarget?.title || ''} 
        loading={deleting} 
      />
    </div>
  );
}
