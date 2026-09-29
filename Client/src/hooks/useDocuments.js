import { useState, useCallback } from 'react';
import { documentsService } from '../api';

/**
 * Documents List Hook
 * 
 * Manages document list operations (CRUD for document metadata).
 * Separate from useDocument which manages single document editing.
 * 
 * @returns {Object} Documents state and operations
 */
export const useDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all documents for current user
   */
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[useDocuments] Fetching documents...');
      const { documents } = await documentsService.getDocuments();
      setDocuments(documents);
      console.log('[useDocuments] Fetched', documents.length, 'documents');
      return { success: true, documents };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load documents';
      console.error('[useDocuments] Fetch error:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new document
   * @param {Object} data - Document data
   * @param {string} data.title - Document title
   */
  const createDocument = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[useDocuments] Creating document:', data.title);
      const { document } = await documentsService.createDocument(data);
      setDocuments(prev => [document, ...prev]);
      console.log('[useDocuments] Document created:', document._id);
      return { success: true, document };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create document';
      console.error('[useDocuments] Create error:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update a document
   * @param {string} documentId - Document ID
   * @param {Object} updates - Fields to update
   */
  const updateDocument = useCallback(async (documentId, updates) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[useDocuments] Updating document:', documentId);
      const { document } = await documentsService.updateDocument(documentId, updates);
      setDocuments(prev => prev.map(doc => doc._id === documentId ? document : doc));
      console.log('[useDocuments] Document updated');
      return { success: true, document };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update document';
      console.error('[useDocuments] Update error:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete a document
   * @param {string} documentId - Document ID
   */
  const deleteDocument = useCallback(async (documentId) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[useDocuments] Deleting document:', documentId);
      await documentsService.deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc._id !== documentId));
      console.log('[useDocuments] Document deleted');
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete document';
      console.error('[useDocuments] Delete error:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Duplicate a document
   * @param {string} documentId - Document ID to duplicate
   */
  const duplicateDocument = useCallback(async (documentId) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[useDocuments] Duplicating document:', documentId);
      const { document } = await documentsService.duplicateDocument(documentId);
      setDocuments(prev => [document, ...prev]);
      console.log('[useDocuments] Document duplicated:', document._id);
      return { success: true, document };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to duplicate document';
      console.error('[useDocuments] Duplicate error:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // State
    documents,
    loading,
    error,
    
    // Actions
    fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    duplicateDocument,
    clearError: () => setError(null),
  };
};
