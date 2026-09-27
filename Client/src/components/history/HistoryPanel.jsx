import { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import SnapshotItem from './SnapshotItem';
import Editor from '../editor/Editor';
import apiClient from '../../lib/apiClient';
import { useDocumentStore } from '../../store/documentStore';

export default function HistoryPanel({ open, onClose, documentId }) {
  const [snapshots, setSnapshots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [previewAst, setPreviewAst] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const { setAst, setVersion, document: doc } = useDocumentStore();

  useEffect(() => {
    if (!open || !documentId) return;
    apiClient.get(`/api/documents/${documentId}/history`)
      .then((r) => setSnapshots(r.data.snapshots))
      .catch(console.error);
  }, [open, documentId]);

  const handleSelect = async (snap) => {
    setSelected(snap);
    try {
      const r = await apiClient.get(`/api/documents/${documentId}/history/${snap._id}`);
      setPreviewAst(r.data.snapshot.ast);
    } catch { /* ignore */ }
  };

  const handleRestore = async (snap) => {
    setRestoring(true);
    try {
      const r = await apiClient.post(`/api/documents/${documentId}/history/${snap._id}/restore`);
      setAst(r.data.document.astSnapshot);
      setVersion(r.data.document.version);
      onClose();
    } catch { /* ignore */ }
    finally { setRestoring(false); }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Version history" side="right">
      <div className="flex h-full flex-col">
        {/* Snapshot list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {snapshots.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              No snapshots yet. One is saved every {import.meta.env.VITE_SNAPSHOT_INTERVAL || 20} versions.
            </p>
          ) : (
            snapshots.map((s) => (
              <SnapshotItem key={s._id} snapshot={s}
                selected={selected?._id === s._id}
                onSelect={handleSelect}
                onRestore={handleRestore}
                restoring={restoring} />
            ))
          )}
        </div>

        {/* Read-only preview */}
        {previewAst && (
          <div className="border-t border-gray-200 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Preview</p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
              <Editor readOnly ast={previewAst} />
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
