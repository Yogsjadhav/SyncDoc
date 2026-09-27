import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import { socketAuth } from '../middleware/socketAuth';
import { DocumentModel } from '../models/Document';
import { User } from '../models/User';
import { roomManager } from './roomManager';
import { handleSubmitOp } from './opHandler';

let io: Server;

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialised');
  return io;
}

export function attachSocketIO(server: HttpServer): void {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(socketAuth);

  io.on('connection', (socket: Socket) => {
    // ── join-document ────────────────────────────────────────────────────
    socket.on('join-document', async ({ documentId }: { documentId: string }) => {
      try {
        if (!Types.ObjectId.isValid(documentId)) {
          socket.emit('error', { code: 'INVALID_DOCUMENT' }); return;
        }
        const userId = socket.user!.userId;
        const doc = await DocumentModel.findById(documentId);
        if (!doc) { socket.emit('error', { code: 'NOT_FOUND' }); return; }

        const isOwner = doc.ownerId.toString() === userId;
        const isCollab = doc.collaborators.some(c => c.userId.toString() === userId);
        if (!isOwner && !isCollab) { socket.emit('error', { code: 'UNAUTHORIZED' }); return; }

        const user = await User.findById(userId).lean();
        if (!user) return;

        const room = `doc:${documentId}`;
        await socket.join(room);

        roomManager.add(documentId, {
          socketId: socket.id,
          userId,
          name: user.name,
          email: user.email,
          avatarColor: user.avatarColor,
        });

        // Send current state to joining client
        socket.emit('sync-response', {
          documentId,
          version: doc.version,
          ast: doc.astSnapshot,
        });

        // Send current presence list to joining client
        socket.emit('presence-list', {
          documentId,
          users: roomManager.getUsers(documentId),
        });

        // Notify others
        socket.to(room).emit('user-joined', {
          documentId,
          user: { userId, name: user.name, email: user.email, avatarColor: user.avatarColor },
        });
      } catch (err) { console.error('[join-document]', err); }
    });

    // ── leave-document ───────────────────────────────────────────────────
    socket.on('leave-document', ({ documentId }: { documentId: string }) => {
      leaveDoc(socket, documentId);
    });

    // ── submit-op ────────────────────────────────────────────────────────
    socket.on('submit-op', (payload) => {
      handleSubmitOp(io, socket, payload).catch(err => console.error('[submit-op]', err));
    });

    // ── presence-update ──────────────────────────────────────────────────
    socket.on('presence-update', ({ documentId, cursor, selection }: {
      documentId: string;
      cursor?: { pos: number };
      selection?: { anchor: number; head: number };
    }) => {
      const userId = socket.user!.userId;
      roomManager.updatePresence(documentId, userId, cursor, selection);
      socket.to(`doc:${documentId}`).emit('presence-broadcast', {
        documentId, userId, cursor, selection,
      });
    });

    // ── sync-request ─────────────────────────────────────────────────────
    socket.on('sync-request', async ({ documentId }: { documentId: string }) => {
      try {
        const doc = await DocumentModel.findById(documentId).lean();
        if (!doc) return;
        socket.emit('sync-response', {
          documentId,
          version: doc.version,
          ast: doc.astSnapshot,
        });
      } catch (err) { console.error('[sync-request]', err); }
    });

    // ── disconnect ───────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const info = roomManager.removeBySocket(socket.id);
      if (info) {
        io.to(`doc:${info.docId}`).emit('user-left', {
          documentId: info.docId,
          userId: info.userId,
        });
      }
    });
  });
}

function leaveDoc(socket: Socket, documentId: string) {
  const userId = socket.user!.userId;
  socket.leave(`doc:${documentId}`);
  roomManager.remove(documentId, userId);
  socket.to(`doc:${documentId}`).emit('user-left', { documentId, userId });
}
