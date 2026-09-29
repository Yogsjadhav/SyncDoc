/**
 * Hooks Layer - Central export point
 * 
 * This layer provides custom React hooks that bridge the UI with State and API layers.
 * Hooks encapsulate business logic and provide a clean interface for components.
 * 
 * Architecture flow:
 * UI Layer → Hooks Layer → State Layer → API Layer
 * 
 * Hooks responsibilities:
 * - Manage loading and error states
 * - Call API services
 * - Update state stores
 * - Provide clean interfaces for UI components
 * - Handle side effects
 */

// Authentication hooks
export { useAuth } from './useAuth';

// Document management hooks
export { useDocuments } from './useDocuments';
export { useDocumentHistory } from './useDocumentHistory';

// Real-time collaboration hooks (existing - named exports)
export { useDocument } from './useDocument';
export { usePresence } from './usePresence';
export { useSocket } from './useSocket';
