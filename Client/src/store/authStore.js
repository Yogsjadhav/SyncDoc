import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** @typedef {{ _id: string, name: string, email: string, avatarColor: string }} AuthUser */

export const useAuthStore = create(
  persist(
    (set) => ({
      /** @type {AuthUser|null} */
      user: null,
      /** @type {string|null} */
      token: null,
      /**
       * @param {AuthUser} user
       * @param {string} token
       */
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'auth-storage' }
  )
);
