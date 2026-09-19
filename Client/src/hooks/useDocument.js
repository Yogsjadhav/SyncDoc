import { useEffect, useRef, useCallback } from 'react';
import apiClient from '../lib/apiClient';
import { useDocumentStore } from '../store/documentStore';

const DEBOUNCE_MS = 150;

/**
 * Fetches document on mount, seeds the store, and provides
 * a debounced `submitOps` that batches local ops before sending.
 */
export function useDocument(documentId, submitOpSocket) {
  const { setDocument, setAst, setVersion, setRole, flushLocalOps } = useDocumentStore();
  const timerRef = useRef(null);

  // ── Initial fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!documentId) return;
    apiClient.get(`/api/documents/${documentId}`).then((res) => {
      const { document, role } = res.data;
      setDocument(document);
      setAst(document.astSnapshot);
      setVersion(document.version);
      setRole(role);
    }).catch(console.error);
  }, [documentId, setDocument, setAst, setVersion, setRole]);

  // ── Debounced op flush ───────────────────────────────────────────────────
  const scheduleFlush = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const ops = flushLocalOps();
      if (ops.length === 0) return;
      const version = useDocumentStore.getState().version;
      submitOpSocket(version, ops);
    }, DEBOUNCE_MS);
  }, [flushLocalOps, submitOpSocket]);

  return { scheduleFlush };
}
