import apiClient from './client';

/**
 * Documents API Service
 * Handles all document-related API calls
 */

/**
 * Get all documents for the current user
 * @returns {Promise<{documents: Array}>}
 */
export const getDocuments = async () => {
  console.log('[Documents Service] Get all documents');
  const response = await apiClient.get('/api/documents');
  return response.data;
};

/**
 * Get a single document by ID
 * @param {string} documentId - Document ID
 * @returns {Promise<{document: Object, role: string}>}
 */
export const getDocument = async (documentId) => {
  console.log('[Documents Service] Get document:', documentId);
  const response = await apiClient.get(`/api/documents/${documentId}`);
  return response.data;
};

/**
 * Create a new document
 * @param {Object} data - Document data
 * @param {string} data.title - Document title
 * @returns {Promise<{document: Object}>}
 */
export const createDocument = async (data) => {
  console.log('[Documents Service] Create document:', data.title);
  const response = await apiClient.post('/api/documents', data);
  return response.data;
};

/**
 * Update a document
 * @param {string} documentId - Document ID
 * @param {Object} updates - Updates to apply
 * @param {string} [updates.title] - New title
 * @param {Array} [updates.collaborators] - New collaborators list
 * @returns {Promise<{document: Object}>}
 */
export const updateDocument = async (documentId, updates) => {
  console.log('[Documents Service] Update document:', documentId, updates);
  const response = await apiClient.patch(`/api/documents/${documentId}`, updates);
  return response.data;
};

/**
 * Delete a document
 * @param {string} documentId - Document ID
 * @returns {Promise<void>}
 */
export const deleteDocument = async (documentId) => {
  console.log('[Documents Service] Delete document:', documentId);
  await apiClient.delete(`/api/documents/${documentId}`);
};

/**
 * Duplicate a document
 * @param {string} documentId - Document ID to duplicate
 * @returns {Promise<{document: Object}>}
 */
export const duplicateDocument = async (documentId) => {
  console.log('[Documents Service] Duplicate document:', documentId);
  const response = await apiClient.post(`/api/documents/${documentId}/duplicate`);
  return response.data;
};

/**
 * Get document history (snapshots)
 * @param {string} documentId - Document ID
 * @returns {Promise<{snapshots: Array}>}
 */
export const getDocumentHistory = async (documentId) => {
  console.log('[Documents Service] Get document history:', documentId);
  const response = await apiClient.get(`/api/documents/${documentId}/history`);
  return response.data;
};

/**
 * Get a specific snapshot
 * @param {string} documentId - Document ID
 * @param {string} snapshotId - Snapshot ID
 * @returns {Promise<{snapshot: Object}>}
 */
export const getSnapshot = async (documentId, snapshotId) => {
  console.log('[Documents Service] Get snapshot:', documentId, snapshotId);
  const response = await apiClient.get(`/api/documents/${documentId}/history/${snapshotId}`);
  return response.data;
};

/**
 * Restore a document to a previous snapshot
 * @param {string} documentId - Document ID
 * @param {string} snapshotId - Snapshot ID to restore
 * @returns {Promise<{document: Object, restoredVersion: number}>}
 */
export const restoreSnapshot = async (documentId, snapshotId) => {
  console.log('[Documents Service] Restore snapshot:', documentId, snapshotId);
  const response = await apiClient.post(`/api/documents/${documentId}/history/${snapshotId}/restore`);
  return response.data;
};
