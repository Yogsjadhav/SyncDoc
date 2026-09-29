import mongoose, { Document, Schema, Types } from 'mongoose';
import { ASTDocument } from '../merge-engine/types';

// Snapshot - saves the complete document state at certain versions
// This speeds up document loading - instead of replaying all operations from the beginning,
// we can start from the most recent snapshot
export interface ISnapshot extends Document {
  documentId: Types.ObjectId;   // Which document this snapshot belongs to
  version: number;               // Which version of the document this snapshot represents
  ast: ASTDocument;              // The complete document content at this version
  label: string | null;          // Optional user-created label (like "Before major rewrite")
  createdAt: Date;               // When this snapshot was created
}

const SnapSchema = new Schema<ISnapshot>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    version:    { type: Number, required: true },
    ast:        { type: Schema.Types.Mixed, required: true },  // Complete document structure
    label:      { type: String, default: null },               // Optional human-readable label
  },
  { timestamps: { createdAt: true, updatedAt: false } }  // Only track creation time
);

// Index for quickly finding the latest snapshot for a document
SnapSchema.index({ documentId: 1, version: -1 });

export const Snapshot = mongoose.model<ISnapshot>('Snapshot', SnapSchema);
