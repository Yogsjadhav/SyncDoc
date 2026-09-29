/**
 * Room Manager - Tracks Active Users
 * 
 * Manages which users are currently viewing/editing each document.
 * This enables presence features like showing who else is online.
 */

// Define what information we track for each user in a document
export interface RoomMember {
  socketId: string;      // Unique ID for this connection
  userId: string;        // User's database ID
  name: string;          // User's display name
  email: string;         // User's email
  avatarColor: string;   // Color for their avatar
  cursor?: { pos: number };                        // Current cursor position
  selection?: { anchor: number; head: number };    // Selected text range
}

// Store all active users grouped by document
// Structure: Map<documentId, Map<userId, user info>>
const rooms = new Map<string, Map<string, RoomMember>>();

/**
 * Get or create the room for a document
 */
function room(docId: string): Map<string, RoomMember> {
  if (!rooms.has(docId)) {
    rooms.set(docId, new Map());
  }
  return rooms.get(docId)!;
}

export const roomManager = {
  /**
   * Add a user to a document room
   */
  add(docId: string, member: RoomMember) { 
    room(docId).set(member.userId, member); 
  },

  /**
   * Remove a user from a document room
   */
  remove(docId: string, userId: string) {
    rooms.get(docId)?.delete(userId);
    
    // If room is now empty, delete it to free memory
    if (rooms.get(docId)?.size === 0) {
      rooms.delete(docId);
    }
  },

  /**
   * Remove a user by their socket ID (used when they disconnect)
   * Returns the document and user IDs if found
   */
  removeBySocket(socketId: string): { docId: string; userId: string } | null {
    // Search through all rooms to find this socket
    for (const [docId, members] of rooms) {
      for (const [userId, member] of members) {
        if (member.socketId === socketId) {
          members.delete(userId);
          
          // Clean up empty room
          if (members.size === 0) {
            rooms.delete(docId);
          }
          
          return { docId, userId };
        }
      }
    }
    return null;  // Socket not found in any room
  },

  /**
   * Update a user's cursor position or text selection
   */
  updatePresence(
    docId: string, 
    userId: string,
    cursor?: RoomMember['cursor'], 
    selection?: RoomMember['selection']
  ) {
    const member = rooms.get(docId)?.get(userId);
    if (!member) return;  // User not in this room
    
    // Update cursor position if provided
    if (cursor !== undefined) {
      member.cursor = cursor;
    }
    
    // Update text selection if provided
    if (selection !== undefined) {
      member.selection = selection;
    }
  },

  /**
   * Get all users currently in a document
   */
  getUsers(docId: string): RoomMember[] {
    return Array.from(room(docId).values());
  },

  /**
   * Count how many users are in a document
   */
  count(docId: string): number { 
    return rooms.get(docId)?.size ?? 0; 
  },
};
