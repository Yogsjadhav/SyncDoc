/**
 * Automatic Snapshot Scheduler
 * 
 * Saves document snapshots at regular intervals for version history.
 * This allows users to restore documents to previous versions.
 */

import { Snapshot } from '../models/Snapshot';
import { ASTDocument } from '../merge-engine/types';

// Save a snapshot every 100 versions
const SNAPSHOT_INTERVAL = 100;

/**
 * Maybe save a snapshot (if it's time for one)
 * 
 * Snapshots are saved every SNAPSHOT_INTERVAL versions.
 * For example: version 100, 200, 300, etc.
 */
export async function maybeSaveSnapshot(
  documentId: string,
  version: number,
  ast: ASTDocument
): Promise<void> {
  // Check if this version should have a snapshot
  // Example: version 100 % 100 = 0, so save it
  if (version % SNAPSHOT_INTERVAL === 0) {
    try {
      // Save snapshot to database
      await Snapshot.create({
        documentId,
        version,
        ast,
        label: `Auto-snapshot v${version}`,
      });
      
      console.log(`Snapshot saved for document ${documentId} at version ${version}`);
    } catch (err) {
      // Don't crash if snapshot fails, just log it
      console.error('Failed to save snapshot:', err);
    }
  }
}

/**
 * Create a manual snapshot (user-initiated)
 * 
 * This allows users to create labeled snapshots at any time,
 * not just at automatic intervals.
 */
export async function createManualSnapshot(
  documentId: string,
  version: number,
  ast: ASTDocument,
  label: string
) {
  return await Snapshot.create({
    documentId,
    version,
    ast,
    label,
  });
}
