import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import { socketAuth } from '../middleware/socketAuth';
import { DocumentModel } from '../models/Document';
import { User } from '../models/User';
import { roomManager } from './roomManager';
import { handleSubmitOp } from './opHandler';

// Store the Socket.IO server instance globally so other parts of the app can access it
let io: Server;

// Get the Socket.IO server instance (throws error if not initialized yet)
export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialised');
  return io;
}

// Set up WebSocket server and handle all real-time events for collaborative editing
export function attachSocketIO(server: HttpServer): void {
  // Create Socket.IO server with CORS settings to allow connections from the client
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Verify JWT token before allowing any socket connection
  io.use(socketAuth);

  // Handle new client connections
  io.on('connection', (socket: Socket) => {
    
    // When a user wants to open and edit a document
    socket.on('join-document', async ({ documentId }: { documentId: string }) => {
      try {
        // Check if document ID is valid MongoDB ObjectId
        if (!Types.ObjectId.isValid(documentId)) {
          socket.emit('error', { code: 'INVALID_DOCUMENT' }); 
          return;
        }

        const userId = socket.user!.userId;
        const doc = await DocumentModel.findById(documentId);
        
        // Document must exist
        if (!doc) { 
          socket.emit('error', { code: 'NOT_FOUND' }); 
          return; 
        }

        // Check if user has permission to access this document (owner or collaborator)
        const isOwner = doc.ownerId.toString() === userId;
        const isCollab = doc.collaborators.some(c => c.userId.toString() === userId);
        if (!isOwner && !isCollab) { 
          socket.emit('error', { code: 'UNAUTHORIZED' }); 
          return; 
        }

        // Get user details to share with other collaborators
        const user = await User.findById(userId).lean();
        if (!user) return;

        // Join the document's room so this user receives updates
        const room = `doc:${documentId}`;
        await socket.join(room);

        // Track this user's presence in the document
        roomManager.add(documentId, {
          socketId: socket.id,
          userId,
          name: user.name,
          email: user.email,
          avatarColor: user.avatarColor,
        });

        // Send the current document content and version to the joining user
        socket.emit('sync-response', {
          documentId,
          version: doc.version,
          ast: doc.astSnapshot,
        });

        // Send list of all users currently editing this document
        socket.emit('presence-list', {
          documentId,
          users: roomManager.getUsers(documentId),
        });

        // Tell other users in the document that someone new joined
        socket.to(room).emit('user-joined', {
          documentId,
          user: { userId, name: user.name, email: user.email, avatarColor: user.avatarColor },
        });
      } catch (err) { 
        console.error('[join-document]', err); 
      }
    });

    // When a user closes a document or navigates away
    socket.on('leave-document', ({ documentId }: { documentId: string }) => {
      leaveDoc(socket, documentId);
    });

    // When a user makes an edit to the document (insert, delete, format, etc.)
    socket.on('submit-op', (payload) => {
      handleSubmitOp(io, socket, payload).catch(err => console.error('[submit-op]', err));
    });

    // When a user moves their cursor or selects text (for showing cursor positions to others)
    socket.on('presence-update', ({ documentId, cursor, selection }: {
      documentId: string;
      cursor?: { pos: number };
      selection?: { anchor: number; head: number };
    }) => {
      const userId = socket.user!.userId;
      
      // Update this user's cursor/selection position
      roomManager.updatePresence(documentId, userId, cursor, selection);
      
      // Broadcast the cursor position to all other users in the document
      socket.to(`doc:${documentId}`).emit('presence-broadcast', {
        documentId, userId, cursor, selection,
      });
    });

    // When a user requests the latest document state (for reconnection or sync issues)
    socket.on('sync-request', async ({ documentId }: { documentId: string }) => {
      try {
        const doc = await DocumentModel.findById(documentId).lean();
        if (!doc) return;
        
        // Send back the current document version and content
        socket.emit('sync-response', {
          documentId,
          version: doc.version,
          ast: doc.astSnapshot,
        });
      } catch (err) { 
        console.error('[sync-request]', err); 
      }
    });

    // When a user disconnects (closes browser, loses connection, etc.)
    socket.on('disconnect', () => {
      // Remove them from all documents and notify other users
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

// Helper function to cleanly remove a user from a document room
function leaveDoc(socket: Socket, documentId: string) {
  const userId = socket.user!.userId;
  
  // Remove from Socket.IO room
  socket.leave(`doc:${documentId}`);
  
  // Remove from presence tracking
  roomManager.remove(documentId, userId);
  
  // Tell other users this person left
  socket.to(`doc:${documentId}`).emit('user-left', { documentId, userId });
}
