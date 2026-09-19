import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useDocumentStore } from '../store/documentStore';

let globalSocket = null;

/**
 * Manages a single Socket.IO connection for the current document.
 * On mount: connects, joins room, wires all server→client events.
 * On unmount: leaves room (connection persists for reuse).
 */
export function useSocket(documentId) {
  const token = useAuthStore((s) => s.token);
  const {
    setAst, setVersion, setPresenceUser, removePresenceUser,
    addConflict, clearPresence,
  } = useDocumentStore();

  const socketRef = useRef(null);

  // ── Connect once per session ─────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    if (!globalSocket) {
      globalSocket = io(import.meta.env.VITE_SOCKET_URL || '', {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
      });
    }
    socketRef.current = globalSocket;
  }, [token]);

  // ── Join / leave document room ───────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !documentId) return;

    socket.emit('join-document', { documentId });

    // ── Server → client handlers ─────────────────────────────────────────
    const onSyncResponse = ({ ast, version }) => {
      setAst(ast);
      setVersion(version);
    };

    const onOpBroadcast = ({ ops, version, conflicts = [] }) => {
      // Apply each resolved op to the local AST
      const store = useDocumentStore.getState();
      if (store.ast && ops.length > 0) {
        // Import applyOps lazily to avoid circular deps at module parse time
        import('../lib/applyOpsClient.js').then(({ applyOps }) => {
          const newAst = applyOps(store.ast, ops);
          setAst(newAst);
        });
      }
      setVersion(version);
      conflicts.forEach((c) => addConflict(c));
    };

    const onPresenceBroadcast = ({ userId, cursor, selection, user }) => {
      setPresenceUser({ userId, cursor, selection, ...user });
    };

    const onPresenceList = ({ users }) => {
      clearPresence();
      users.forEach((u) => setPresenceUser(u));
    };

    const onUserJoined = ({ user }) => setPresenceUser(user);
    const onUserLeft   = ({ userId }) => removePresenceUser(userId);

    const onReconnect = () => {
      socket.emit('sync-request', { documentId });
    };

    socket.on('sync-response',     onSyncResponse);
    socket.on('op-broadcast',      onOpBroadcast);
    socket.on('presence-broadcast',onPresenceBroadcast);
    socket.on('presence-list',     onPresenceList);
    socket.on('user-joined',       onUserJoined);
    socket.on('user-left',         onUserLeft);
    socket.on('connect',           onReconnect);

    return () => {
      socket.emit('leave-document', { documentId });
      socket.off('sync-response',     onSyncResponse);
      socket.off('op-broadcast',      onOpBroadcast);
      socket.off('presence-broadcast',onPresenceBroadcast);
      socket.off('presence-list',     onPresenceList);
      socket.off('user-joined',       onUserJoined);
      socket.off('user-left',         onUserLeft);
      socket.off('connect',           onReconnect);
      clearPresence();
    };
  }, [documentId, setAst, setVersion, setPresenceUser, removePresenceUser, addConflict, clearPresence]);

  // ── Emit helpers ─────────────────────────────────────────────────────────
  const submitOp = useCallback((baseVersion, ops) => {
    socketRef.current?.emit('submit-op', { documentId, baseVersion, ops });
  }, [documentId]);

  const emitPresence = useCallback((cursor, selection) => {
    socketRef.current?.emit('presence-update', { documentId, cursor, selection });
  }, [documentId]);

  return { submitOp, emitPresence };
}
