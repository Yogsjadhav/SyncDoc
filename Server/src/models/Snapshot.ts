import mongoose, { Document, Schema, Types } from 'mongoose';
import { ASTDocument } from '../merge-engine/types';

export interface ISnapshot extends Document {
  documentId: Types.ObjectId;
  version: number;
  ast: ASTDocument;
  label: string | null;
  createdAt: Date;
}

const SnapSchema = new Schema<ISnapshot>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    version:    { type: Number, required: true },
    ast:        { type: Schema.Types.Mixed, required: true },
    label:      { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SnapSchema.index({ documentId: 1, version: -1 });

export const Snapshot = mongoose.model<ISnapshot>('Snapshot', SnapSchema);
