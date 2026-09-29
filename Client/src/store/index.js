/**
 * State Layer - Central export point
 * 
 * This layer manages application state using Zustand stores.
 * Stores are organized by domain and provide actions to modify state.
 * 
 * Architecture:
 * - authStore: User authentication state (persisted)
 * - documentStore: Current document editing state (in-memory)
 */

export { useAuthStore } from './authStore';
export { useDocumentStore } from './documentStore';
