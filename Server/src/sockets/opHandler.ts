import { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import { DocumentModel } from '../models/Document';
import { OpLog } from '../models/OpLog';
import { getMutex } from '../utils/docMutex';
import { maybeSaveSnapshot } from '../utils/snapshotScheduler';
import { rebase, applyOps } from '../merge-engine';
import { ASTOperation } from '../merge-engine/types';

const MAX_GAP = 500;

export interface SubmitOpPayload {
  documentId: string;
  baseVersion: number;
  ops: ASTOperation[];
}

export async function handleSubmitOp(
  io: Server,
  socket: Socket,
  payload: SubmitOpPayload
): Promise<void> {
  const { documentId, baseVersion, ops } = payload;
  const userId = socket.user!.userId;

  if (!Types.ObjectId.isValid(documentId) || !Array.isArray(ops) || ops.length === 0) return;

  const release = await getMutex(documentId).acquire();
  try {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) { socket.emit('error', { code: 'NOT_FOUND' }); return; }

    const currentVersion = doc.version;

    if (currentVersion - baseVersion > MAX_GAP) {
      socket.emit('error', { code: 'VERSION_GAP_TOO_LARGE' });
      socket.emit('sync-response', { documentId, version: currentVersion, ast: doc.astSnapshot });
      return;
    }

    // Fetch gap op-log entries
    const gapLogs = await OpLog.find({
      documentId,
      version: { $gt: baseVersion, $lte: currentVersion },
    }).sort({ version: 1 });

    const committedBatches = gapLogs.map(l => ({
      ops: l.ops as ASTOperation[],
      userId: l.userId.toString(),
    }));

    // Rebase
    const { resolvedOps, conflicts } = rebase(ops, committedBatches, doc.astSnapshot, userId);

    const newAst = resolvedOps.length > 0 ? applyOps(doc.astSnapshot, resolvedOps) : doc.astSnapshot;
    const newVersion = currentVersion + 1;

    await OpLog.create({ documentId, version: newVersion, userId, ops: resolvedOps.length ? resolvedOps : ops });
    doc.astSnapshot = newAst;
    doc.version = newVersion;
    await doc.save();

    await maybeSaveSnapshot(documentId, newVersion, newAst);

    release();

    // Broadcast to entire room (sender receives as confirmation)
    io.to(`doc:${documentId}`).emit('op-broadcast', {
      documentId, version: newVersion, ops: resolvedOps, userId, conflicts,
    });

  } catch (err) {
    release();
    console.error('[opHandler]', err);
    socket.emit('error', { code: 'COMMIT_FAILED', message: 'Failed to commit op' });
  }
}
