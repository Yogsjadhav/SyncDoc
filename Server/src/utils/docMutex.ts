/**
 * Document Mutex Manager
 * 
 * Prevents race conditions when multiple users edit the same document simultaneously.
 * A mutex (mutual exclusion) ensures only one operation modifies a document at a time.
 */

import { Mutex } from 'async-mutex';

// Store one mutex per document (key = documentId, value = Mutex instance)
const mutexMap = new Map<string, Mutex>();

/**
 * Get the mutex for a specific document
 * Creates a new one if it doesn't exist yet
 * 
 * Usage:
 *   const release = await getMutex(docId).acquire();
 *   try {
 *     // ... modify document safely ...
 *   } finally {
 *     release();  // Always release the lock!
 *   }
 */
export function getMutex(documentId: string): Mutex {
  // If this document doesn't have a mutex yet, create one
  if (!mutexMap.has(documentId)) {
    mutexMap.set(documentId, new Mutex());
  }
  
  return mutexMap.get(documentId)!;
}

/**
 * Remove a document's mutex (optional cleanup)
 * Call this when a document is deleted
 */
export function cleanupMutex(documentId: string): void {
  mutexMap.delete(documentId);
}
