export interface RoomMember {
  socketId: string;
  userId: string;
  name: string;
  email: string;
  avatarColor: string;
  cursor?: { pos: number };
  selection?: { anchor: number; head: number };
}

const rooms = new Map<string, Map<string, RoomMember>>();

function room(docId: string): Map<string, RoomMember> {
  if (!rooms.has(docId)) rooms.set(docId, new Map());
  return rooms.get(docId)!;
}

export const roomManager = {
  add(docId: string, m: RoomMember) { room(docId).set(m.userId, m); },

  remove(docId: string, userId: string) {
    rooms.get(docId)?.delete(userId);
    if (rooms.get(docId)?.size === 0) rooms.delete(docId);
  },

  removeBySocket(socketId: string): { docId: string; userId: string } | null {
    for (const [docId, r] of rooms) {
      for (const [userId, m] of r) {
        if (m.socketId === socketId) {
          r.delete(userId);
          if (r.size === 0) rooms.delete(docId);
          return { docId, userId };
        }
      }
    }
    return null;
  },

  updatePresence(docId: string, userId: string,
    cursor?: RoomMember['cursor'], selection?: RoomMember['selection']) {
    const m = rooms.get(docId)?.get(userId);
    if (!m) return;
    if (cursor !== undefined) m.cursor = cursor;
    if (selection !== undefined) m.selection = selection;
  },

  getUsers(docId: string): RoomMember[] {
    return Array.from(room(docId).values());
  },

  count(docId: string): number { return rooms.get(docId)?.size ?? 0; },
};
