import mongoose, { Document, Schema, Types } from 'mongoose';
import { ASTOperation } from '../merge-engine/types';

// Operation Log - records every change made to a document
// This is essential for collaborative editing - it lets us merge changes from multiple users
export interface IOpLog extends Document {
  documentId: Types.ObjectId;   // Which document this operation belongs to
  version: number;               // Which version this operation created (increments by 1 each time)
  userId: Types.ObjectId;        // Who made this change
  ops: ASTOperation[];           // The actual operations (insert, delete, format, etc.)
  createdAt: Date;               // When this change was made
}

const OpLogSchema = new Schema<IOpLog>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    version:    { type: Number, required: true },
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ops:        { type: Schema.Types.Mixed, required: true },  // Mixed type because operations vary
  },
  { timestamps: { createdAt: true, updatedAt: false } }  // Only track creation time
);

// Ensure each version for a document is unique (prevents duplicate operations)
OpLogSchema.index({ documentId: 1, version: 1 }, { unique: true });

export const OpLog = mongoose.model<IOpLog>('OpLog', OpLogSchema);
