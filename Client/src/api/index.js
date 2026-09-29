/**
 * API Layer - Central export point
 * 
 * This layer is responsible for all HTTP communication with the backend.
 * Services are organized by domain (auth, documents, etc.)
 */

export * as authService from './auth.service';
export * as documentsService from './documents.service';
export { default as apiClient } from './client';
