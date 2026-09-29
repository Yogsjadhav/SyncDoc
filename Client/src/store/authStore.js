import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Authentication State Store
 * 
 * Manages user authentication state including user data and JWT token.
 * State is persisted to localStorage for session persistence.
 */

/** @typedef {{ _id: string, name: string, email: string, avatarColor: string, createdAt?: string }} User */

/**
 * @typedef {Object} AuthState
 * @property {User|null} user - Current authenticated user
 * @property {string|null} token - JWT authentication token
 * @property {boolean} isAuthenticated - Whether user is authenticated
 */

/**
 * @typedef {Object} AuthActions
 * @property {(user: User, token: string) => void} setAuth - Set authentication data
 * @property {() => void} logout - Clear authentication data
 * @property {(updates: Partial<User>) => void} updateUser - Update user information
 */

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,

      // Computed
      get isAuthenticated() {
        return !!get().token && !!get().user;
      },

      // Actions
      /**
       * Set authentication data (user and token)
       * @param {User} user - User object
       * @param {string} token - JWT token
       */
      setAuth: (user, token) => {
        console.log('[Auth Store] Setting auth:', { userId: user._id, email: user.email });
        set({ user, token });
      },

      /**
       * Clear authentication data (logout)
       */
      logout: () => {
        console.log('[Auth Store] Logging out');
        set({ user: null, token: null });
      },

      /**
       * Update user information
       * @param {Partial<User>} updates - User fields to update
       */
      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          console.log('[Auth Store] Updating user:', updates);
          set({ user: { ...currentUser, ...updates } });
        }
      },
    }),
    { 
      name: 'auth-storage',
      // Only persist user and token
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

