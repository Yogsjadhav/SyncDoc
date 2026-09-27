import mongoose, { Document, Schema, Types } from 'mongoose';
import { ASTOperation } from '../merge-engine/types';

export interface IOpLog extends Document {
  documentId: Types.ObjectId;
  version: number;
  userId: Types.ObjectId;
  ops: ASTOperation[];
  createdAt: Date;
}

const OpLogSchema = new Schema<IOpLog>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    version:    { type: Number, required: true },
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ops:        { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OpLogSchema.index({ documentId: 1, version: 1 }, { unique: true });

export const OpLog = mongoose.model<IOpLog>('OpLog', OpLogSchema);
