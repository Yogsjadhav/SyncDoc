import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  avatarColor: string;
  createdAt: Date;
}

const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6',
                 '#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16',
                 '#f59e0b','#6366f1'];

const UserSchema = new Schema<IUser>(
  {
    name:         { type: String, required: true, trim: true, maxlength: 100 },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarColor:  { type: String, default: () => COLORS[Math.floor(Math.random() * COLORS.length)] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Note: unique:true on the field already creates the index — no need for schema.index()
UserSchema.set('toJSON', { transform: (_doc, ret) => { delete ret.passwordHash; return ret; } });

export const User = mongoose.model<IUser>('User', UserSchema);
