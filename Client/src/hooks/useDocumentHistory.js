import { useState, useCallback } from 'react';
import { documentsService } from '../api';

/**
 * Document History Hook
 * 
 * Manages document version history and snapshot operations.
 * 
 * @param {string} documentId - Current document ID
 * @returns {Object} History state and operations
 */
export const useDocumentHistory = (documentId) => {
  const [snapshots, setSnapshots] = useState([]);
  const [currentSnapshot, setCurrentSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all snapshots for the document
   */
  const fetchHistory = useCallback(async () => {
    if (!documentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('[useDocumentHistory] Fetching history for:', documentId);
      const { snapshots } = await documentsService.getDocumentHistory(documentId);
      setSnapshots(snapshots);
      console.log('[useDocumentHistory] Fetched', snapshots.length, 'snapshots');
      return { success: true, snapshots };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load history';
      console.error('[useDocumentHistory] Fetch error:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  /**
   * Load a specific snapshot
   * @param {string} snapshotId - Snapshot ID
   */
  const loadSnapshot = useCallback(async (snapshotId) => {
    if (!documentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('[useDocumentHistory] Loading snapshot:', snapshotId);
      const { snapshot } = await documentsService.getSnapshot(documentId, snapshotId);
      setCurrentSnapshot(snapshot);
      console.log('[useDocumentHistory] Snapshot loaded');
      return { success: true, snapshot };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load snapshot';
      console.error('[useDocumentHistory] Load error:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  /**
   * Restore document to a snapshot
   * @param {string} snapshotId - Snapshot ID to restore
   */
  const restoreSnapshot = useCallback(async (snapshotId) => {
    if (!documentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('[useDocumentHistory] Restoring snapshot:', snapshotId);
      const { document, restoredVersion } = await documentsService.restoreSnapshot(documentId, snapshotId);
      console.log('[useDocumentHistory] Restored to version:', restoredVersion);
      return { success: true, document, restoredVersion };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to restore snapshot';
      console.error('[useDocumentHistory] Restore error:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  return {
    // State
    snapshots,
    currentSnapshot,
    loading,
    error,
    
    // Actions
    fetchHistory,
    loadSnapshot,
    restoreSnapshot,
    clearSnapshot: () => setCurrentSnapshot(null),
    clearError: () => setError(null),
  };
};
