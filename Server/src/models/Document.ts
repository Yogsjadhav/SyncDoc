import mongoose, { Document, Schema, Types } from 'mongoose';
import { ASTDocument } from '../merge-engine/types';

export type CollabRole = 'viewer' | 'editor';
export interface ICollaborator { userId: Types.ObjectId; role: CollabRole }

export interface IDocument extends Document {
  title: string;
  ownerId: Types.ObjectId;
  collaborators: ICollaborator[];
  version: number;
  astSnapshot: ASTDocument;
  createdAt: Date;
  updatedAt: Date;
}

const CollabSchema = new Schema<ICollaborator>(
  { userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role:   { type: String, enum: ['viewer','editor'], required: true } },
  { _id: false }
);

const DocSchema = new Schema<IDocument>(
  {
    title:       { type: String, required: true, trim: true, maxlength: 500, default: 'Untitled' },
    ownerId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    collaborators: { type: [CollabSchema], default: [] },
    version:     { type: Number, required: true, default: 0 },
    astSnapshot: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

DocSchema.index({ ownerId: 1, updatedAt: -1 });
DocSchema.index({ 'collaborators.userId': 1, updatedAt: -1 });

export const DocumentModel = mongoose.model<IDocument>('Document', DocSchema);
