import { create } from 'zustand';

/**
 * @typedef {{ userId:string, name:string, email:string, avatarColor:string,
 *             cursor?:{pos:number}, selection?:{anchor:number,head:number} }} PresenceUser
 * @typedef {{ _id:string, title:string, ownerId:string,
 *             collaborators:Array<{userId:string,role:string}>,
 *             version:number, createdAt:string, updatedAt:string }} DocMeta
 */

export const useDocumentStore = create((set, get) => ({
  /** @type {DocMeta|null} */      document: null,
  /** @type {object|null} */       ast: null,
  /** @type {number} */            version: 0,
  /** @type {object[]} */          localOps: [],
  /** @type {Map<string,PresenceUser>} */ presence: new Map(),
  /** @type {object[]} */          conflicts: [],
  /** @type {string|null} */       role: null,

  setDocument: (doc) => set({ document: doc }),
  setAst:      (ast) => set({ ast }),
  setVersion:  (v)   => set({ version: v }),
  setRole:     (r)   => set({ role: r }),

  pushLocalOp: (op) => set((s) => ({ localOps: [...s.localOps, op] })),
  flushLocalOps: () => {
    const ops = get().localOps;
    set({ localOps: [] });
    return ops;
  },

  setPresenceUser: (u) =>
    set((s) => { const m = new Map(s.presence); m.set(u.userId, u); return { presence: m }; }),
  removePresenceUser: (userId) =>
    set((s) => { const m = new Map(s.presence); m.delete(userId); return { presence: m }; }),
  clearPresence: () => set({ presence: new Map() }),

  addConflict:     (c)  => set((s) => ({ conflicts: [...s.conflicts, c] })),
  dismissConflict: (i)  => set((s) => ({ conflicts: s.conflicts.filter((_, j) => j !== i) })),

  reset: () => set({ document: null, ast: null, version: 0, localOps: [],
                     presence: new Map(), conflicts: [], role: null }),
}));
