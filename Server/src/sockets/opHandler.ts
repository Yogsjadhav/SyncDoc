import { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import { DocumentModel } from '../models/Document';
import { OpLog } from '../models/OpLog';
import { getMutex } from '../utils/docMutex';
import { maybeSaveSnapshot } from '../utils/snapshotScheduler';
import { rebase, applyOps } from '../merge-engine';
import { ASTOperation } from '../merge-engine/types';

// If a user's local version is more than 500 versions behind, force them to sync
// (prevents extremely long rebase calculations)
const MAX_GAP = 500;

// Data structure for when a user submits an edit operation
export interface SubmitOpPayload {
  documentId: string;         // Which document is being edited
  baseVersion: number;         // What version the user's edit is based on
  ops: ASTOperation[];         // The actual edit operations (insert, delete, format, etc.)
}

// Handle when a user submits an edit to a document
// This is the core of the collaborative editing - it merges changes from multiple users
export async function handleSubmitOp(
  io: Server,
  socket: Socket,
  payload: SubmitOpPayload
): Promise<void> {
  const { documentId, baseVersion, ops } = payload;
  const userId = socket.user!.userId;

  // Validate the incoming data
  if (!Types.ObjectId.isValid(documentId) || !Array.isArray(ops) || ops.length === 0) return;

  // Lock this document so only one edit can be processed at a time (prevents conflicts)
  const release = await getMutex(documentId).acquire();
  
  try {
    // Get the current state of the document from the database
    const doc = await DocumentModel.findById(documentId);
    if (!doc) { 
      socket.emit('error', { code: 'NOT_FOUND' }); 
      return; 
    }

    const currentVersion = doc.version;

    // If the user is too far behind, force them to refresh instead of trying to merge
    if (currentVersion - baseVersion > MAX_GAP) {
      socket.emit('error', { code: 'VERSION_GAP_TOO_LARGE' });
      socket.emit('sync-response', { documentId, version: currentVersion, ast: doc.astSnapshot });
      return;
    }

    // Get all the operations that happened between the user's version and current version
    // These are edits from other users that need to be merged with this user's edit
    const gapLogs = await OpLog.find({
      documentId,
      version: { $gt: baseVersion, $lte: currentVersion },
    }).sort({ version: 1 });

    // Convert the logs into a format the merge engine can work with
    const committedBatches = gapLogs.map(l => ({
      ops: l.ops as ASTOperation[],
      userId: l.userId.toString(),
    }));

    // Use Operational Transformation to merge this user's changes with others' changes
    // This is the magic that makes collaborative editing work - it figures out how to
    // combine edits that were made to different versions of the document
    const { resolvedOps, conflicts } = rebase(ops, committedBatches, doc.astSnapshot, userId);

    // Apply the merged operations to create the new document state
    const newAst = resolvedOps.length > 0 ? applyOps(doc.astSnapshot, resolvedOps) : doc.astSnapshot;
    const newVersion = currentVersion + 1;

    // Save this operation to the log (for future merges and history)
    await OpLog.create({ 
      documentId, 
      version: newVersion, 
      userId, 
      ops: resolvedOps.length ? resolvedOps : ops 
    });

    // Update the document with the new content and version
    doc.astSnapshot = newAst;
    doc.version = newVersion;
    await doc.save();

    // Periodically save snapshots for faster loading (every 100 versions)
    await maybeSaveSnapshot(documentId, newVersion, newAst);

    // Release the lock so other edits can be processed
    release();

    // Send the merged operation to all users editing this document
    // This includes the original sender (as confirmation their edit was accepted)
    io.to(`doc:${documentId}`).emit('op-broadcast', {
      documentId, 
      version: newVersion, 
      ops: resolvedOps, 
      userId, 
      conflicts,
    });

  } catch (err) {
    // Always release the lock, even if something went wrong
    release();
    console.error('[opHandler]', err);
    socket.emit('error', { code: 'COMMIT_FAILED', message: 'Failed to commit op' });
  }
}
