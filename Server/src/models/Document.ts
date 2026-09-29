/**
 * Document Model - MongoDB Schema
 * 
 * Stores document metadata and current content state.
 * Each document has an owner and can be shared with collaborators.
 * 
 * Fields:
 * - title: Document title (user can rename)
 * - ownerId: User who created the document (full permissions)
 * - collaborators: Array of users with viewer/editor access
 * - version: Current version number (increments with each change)
 * - astSnapshot: Current document content as Abstract Syntax Tree
 * - createdAt/updatedAt: Timestamps
 * 
 * Related Collections:
 * - OpLog: Stores all operations (edit history)
 * - Snapshot: Periodic backups of document state
 */

import mongoose, { Document, Schema, Types } from 'mongoose';
import { ASTDocument } from '../merge-engine/types';

/**
 * Collaborator Role Types
 * - viewer: Can only read document
 * - editor: Can read and edit document
 * 
 * Note: Owner role is determined by ownerId field, not collaborators array
 */
export type CollabRole = 'viewer' | 'editor';

/**
 * Collaborator Interface
 * Represents a user who has been given access to a document
 */
export interface ICollaborator { 
  userId: Types.ObjectId;  // Reference to User document
  role: CollabRole;        // Access level (viewer or editor)
}

/**
 * Document Interface
 * Defines TypeScript type for Document documents
 */
export interface IDocument extends Document {
  title: string;                    // Document title
  ownerId: Types.ObjectId;          // User who owns this document
  collaborators: ICollaborator[];   // Users with shared access
  version: number;                  // Current version number
  astSnapshot: ASTDocument;         // Current document content (AST)
  createdAt: Date;                  // When document was created
  updatedAt: Date;                  // When document was last modified
}

/**
 * Collaborator Sub-Schema
 * Embedded in Document schema for the collaborators array
 * 
 * _id: false prevents MongoDB from adding _id to each collaborator
 */
const CollabSchema = new Schema<ICollaborator>(
  { 
    // Reference to User who is a collaborator
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',          // Links to User collection
      required: true 
    },
    
    // Access level for this collaborator
    role: { 
      type: String, 
      enum: ['viewer', 'editor'],  // Only these two values allowed
      required: true 
    } 
  },
  { _id: false }  // Don't add _id field to collaborators
);

/**
 * Document Schema Definition
 * Defines structure and validation rules for documents
 */
const DocSchema = new Schema<IDocument>(
  {
    // Document title (user can rename)
    title: { 
      type: String, 
      required: true, 
      trim: true,           // Remove whitespace
      maxlength: 500,       // Prevent extremely long titles
      default: 'Untitled'   // Default for new documents
    },
    
    // Owner of the document (full permissions)
    ownerId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',          // Links to User collection
      required: true 
    },
    
    // Array of users with shared access
    collaborators: { 
      type: [CollabSchema],  // Array of embedded collaborator objects
      default: []            // Empty array for new documents
    },
    
    // Current version number (increments with each edit)
    version: { 
      type: Number, 
      required: true, 
      default: 0            // Start at version 0
    },
    
    // Current document content as Abstract Syntax Tree
    // Using Mixed type because AST structure is complex and dynamic
    astSnapshot: { 
      type: Schema.Types.Mixed, 
      required: true 
    },
  },
  { 
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true 
  }
);

/**
 * Index: Find documents owned by a user
 * Used in dashboard to list user's documents (sorted by recent)
 */
DocSchema.index({ ownerId: 1, updatedAt: -1 });

/**
 * Index: Find documents shared with a user
 * Used in dashboard to list documents others shared with user
 */
DocSchema.index({ 'collaborators.userId': 1, updatedAt: -1 });

/**
 * Export Document Model
 * Used in routes to query and manipulate documents
 */
export const DocumentModel = mongoose.model<IDocument>('Document', DocSchema);
