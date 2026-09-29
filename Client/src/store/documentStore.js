import { create } from 'zustand';

/**
 * Document State Store
 * 
 * Manages the current document editing state including:
 * - Document metadata
 * - AST (Abstract Syntax Tree) content
 * - Version tracking
 * - Local operations queue
 * - Real-time presence (collaborators)
 * - Conflict notifications
 */

/**
 * @typedef {Object} PresenceUser
 * @property {string} userId - User ID
 * @property {string} name - User name
 * @property {string} email - User email
 * @property {string} avatarColor - User avatar color
 * @property {{pos: number}} [cursor] - Cursor position
 * @property {{anchor: number, head: number}} [selection] - Text selection
 */

/**
 * @typedef {Object} DocumentMeta
 * @property {string} _id - Document ID
 * @property {string} title - Document title
 * @property {string} ownerId - Owner user ID
 * @property {Array<{userId: string, role: 'viewer'|'editor'}>} collaborators - Collaborators
 * @property {number} version - Current version number
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} ConflictInfo
 * @property {string} type - Conflict type
 * @property {string} description - Conflict description
 * @property {string} nodeId - Node ID involved in conflict
 * @property {string} resolution - How conflict was resolved
 */

export const useDocumentStore = create((set, get) => ({
  // State
  /** @type {DocumentMeta|null} */
  document: null,
  
  /** @type {object|null} */
  ast: null,
  
  /** @type {number} */
  version: 0,
  
  /** @type {object[]} */
  localOps: [],
  
  /** @type {Map<string, PresenceUser>} */
  presence: new Map(),
  
  /** @type {ConflictInfo[]} */
  conflicts: [],
  
  /** @type {'owner'|'editor'|'viewer'|null} */
  role: null,

  // Document Actions
  /**
   * Set the current document metadata
   * @param {DocumentMeta} doc - Document metadata
   */
  setDocument: (doc) => {
    console.log('[Document Store] Setting document:', doc._id);
    set({ document: doc });
  },

  /**
   * Set the document AST
   * @param {object} ast - Document AST
   */
  setAst: (ast) => {
    console.log('[Document Store] Setting AST');
    set({ ast });
  },

  /**
   * Set the document version
   * @param {number} version - Version number
   */
  setVersion: (version) => {
    console.log('[Document Store] Setting version:', version);
    set({ version });
  },

  /**
   * Set the user's role in this document
   * @param {'owner'|'editor'|'viewer'} role - User role
   */
  setRole: (role) => {
    console.log('[Document Store] Setting role:', role);
    set({ role });
  },

  // Operations Queue
  /**
   * Add a local operation to the queue
   * @param {object} op - Operation object
   */
  pushLocalOp: (op) => {
    console.log('[Document Store] Pushing local op');
    set((s) => ({ localOps: [...s.localOps, op] }));
  },

  /**
   * Flush and return all local operations
   * @returns {object[]} - Array of local operations
   */
  flushLocalOps: () => {
    const ops = get().localOps;
    console.log('[Document Store] Flushing', ops.length, 'local ops');
    set({ localOps: [] });
    return ops;
  },

  // Presence Management
  /**
   * Update or add a presence user
   * @param {PresenceUser} user - Presence user data
   */
  setPresenceUser: (user) => {
    set((s) => {
      const presence = new Map(s.presence);
      presence.set(user.userId, user);
      console.log('[Document Store] Setting presence user:', user.userId);
      return { presence };
    });
  },

  /**
   * Remove a presence user
   * @param {string} userId - User ID to remove
   */
  removePresenceUser: (userId) => {
    set((s) => {
      const presence = new Map(s.presence);
      presence.delete(userId);
      console.log('[Document Store] Removing presence user:', userId);
      return { presence };
    });
  },

  /**
   * Clear all presence users
   */
  clearPresence: () => {
    console.log('[Document Store] Clearing presence');
    set({ presence: new Map() });
  },

  // Conflict Management
  /**
   * Add a conflict notification
   * @param {ConflictInfo} conflict - Conflict information
   */
  addConflict: (conflict) => {
    console.log('[Document Store] Adding conflict:', conflict.type);
    set((s) => ({ conflicts: [...s.conflicts, conflict] }));
  },

  /**
   * Dismiss a conflict by index
   * @param {number} index - Conflict index to dismiss
   */
  dismissConflict: (index) => {
    console.log('[Document Store] Dismissing conflict:', index);
    set((s) => ({ conflicts: s.conflicts.filter((_, i) => i !== index) }));
  },

  /**
   * Clear all conflicts
   */
  clearConflicts: () => {
    console.log('[Document Store] Clearing conflicts');
    set({ conflicts: [] });
  },

  // Reset
  /**
   * Reset the entire document store to initial state
   */
  reset: () => {
    console.log('[Document Store] Resetting store');
    set({
      document: null,
      ast: null,
      version: 0,
      localOps: [],
      presence: new Map(),
      conflicts: [],
      role: null,
    });
  },
}));
