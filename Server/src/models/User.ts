/**
 * User Model - MongoDB Schema
 * 
 * Stores user account information and authentication data.
 * 
 * Fields:
 * - name: User's full name
 * - email: Unique email address (used for login)
 * - passwordHash: Bcrypt hashed password (NEVER store plain passwords)
 * - avatarColor: Random color for user avatar display
 * - createdAt: Account creation timestamp
 * 
 * Security Features:
 * - Password hash is excluded from queries by default (select: false)
 * - Password hash is removed when converting to JSON
 * - Email is stored in lowercase for case-insensitive matching
 * - Unique index on email prevents duplicate accounts
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * User Document Interface
 * Defines the TypeScript type for User documents
 */
export interface IUser extends Document {
  name: string;           // Full name (e.g., "John Doe")
  email: string;          // Email address (unique, lowercase)
  passwordHash: string;   // Bcrypt hash of password
  avatarColor: string;    // Hex color code for avatar (e.g., "#ef4444")
  createdAt: Date;        // When account was created
}

/**
 * Avatar Color Palette
 * Pre-defined colors assigned randomly to new users
 * Used for displaying user avatars in the UI
 */
const COLORS = [
  '#ef4444',  // Red
  '#f97316',  // Orange
  '#eab308',  // Yellow
  '#22c55e',  // Green
  '#14b8a6',  // Teal
  '#3b82f6',  // Blue
  '#8b5cf6',  // Purple
  '#ec4899',  // Pink
  '#06b6d4',  // Cyan
  '#84cc16',  // Lime
  '#f59e0b',  // Amber
  '#6366f1',  // Indigo
];

/**
 * User Schema Definition
 * Defines the structure and validation rules for User documents
 */
const UserSchema = new Schema<IUser>(
  {
    // User's full name
    name: { 
      type: String, 
      required: true,       // Must provide name
      trim: true,           // Remove whitespace
      maxlength: 100        // Limit length
    },
    
    // Email address (used for login)
    email: { 
      type: String, 
      required: true,       // Must provide email
      unique: true,         // No duplicate emails
      lowercase: true,      // Store in lowercase
      trim: true            // Remove whitespace
    },
    
    // Bcrypt password hash (SECURITY: select: false prevents accidental exposure)
    passwordHash: { 
      type: String, 
      required: true,       // Must have password
      select: false         // Exclude from queries by default (IMPORTANT!)
    },
    
    // Random avatar color for UI display
    avatarColor: { 
      type: String, 
      // Randomly pick color when creating new user
      default: () => COLORS[Math.floor(Math.random() * COLORS.length)] 
    },
  },
  { 
    // Only track creation time, not updates
    timestamps: { 
      createdAt: true,      // Add createdAt field
      updatedAt: false      // Don't add updatedAt field
    } 
  }
);

/**
 * Create Index on Email
 * Makes email lookups fast (used during login)
 * MongoDB automatically creates this due to unique: true, but we make it explicit
 */
UserSchema.index({ email: 1 });

/**
 * Transform Output when Converting to JSON
 * 
 * SECURITY: Always remove passwordHash when sending user data to client
 * This ensures password hash is never accidentally exposed in API responses
 */
UserSchema.set('toJSON', { 
  transform: (_doc, ret) => { 
    delete ret.passwordHash;  // Remove password hash
    return ret; 
  } 
});

/**
 * Export User Model
 * Used in routes to query and create users
 */
export const User = mongoose.model<IUser>('User', UserSchema);
