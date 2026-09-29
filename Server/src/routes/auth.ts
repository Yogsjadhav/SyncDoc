/**
 * Authentication Routes
 * 
 * Handles user authentication operations:
 * - POST /api/auth/signup - Create new user account
 * - POST /api/auth/login  - Authenticate existing user
 * - GET  /api/auth/me     - Get current authenticated user
 * 
 * Security Features:
 * - Passwords are hashed with bcrypt (12 rounds)
 * - JWT tokens expire after 7 days
 * - Validation with express-validator
 * - Comprehensive logging for debugging
 */

import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { authGuard } from '../middleware/authGuard';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

/**
 * Helper function to create JWT tokens
 * 
 * Creates a signed JWT containing user ID and email
 * Token expires after 7 days
 * 
 * @param userId - MongoDB user ID
 * @param email - User email address
 * @returns Signed JWT token string
 */
const sign = (userId: string, email: string) =>
  jwt.sign(
    { userId, email },                      // Payload (data stored in token)
    process.env.JWT_SECRET as string,      // Secret key for signing
    { expiresIn: '7d' }                    // Token valid for 7 days
  );

// ─── POST /api/auth/signup ────────────────────────────────────────────────────

/**
 * Create New User Account
 * 
 * Request Body:
 *   - name: Full name (required, non-empty)
 *   - email: Email address (required, valid email format)
 *   - password: Password (required, minimum 6 characters)
 * 
 * Response Success (201):
 *   { token: "jwt-token", user: {...} }
 * 
 * Response Errors:
 *   - 422: Validation failed (invalid input)
 *   - 409: Email already in use
 *   - 500: Server error
 */
router.post('/signup',
  [
    body('name').trim().notEmpty(),                // Name is required
    body('email').isEmail().normalizeEmail(),      // Must be valid email
    body('password').isLength({ min: 6 })          // Min 6 characters
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    console.log('[Signup] Received request:', { name: req.body.name, email: req.body.email });
    
    // Validate input fields
    const errs = validationResult(req);
    if (!errs.isEmpty()) { 
      console.log('[Signup] Validation errors:', errs.array());
      res.status(422).json({ errors: errs.array() }); 
      return; 
    }
    
    try {
      const { name, email, password } = req.body as { 
        name: string; 
        email: string; 
        password: string 
      };
      
      // Check if email is already registered
      const existingUser = await User.findOne({ email });
      if (existingUser) { 
        console.log('[Signup] Email already in use:', email);
        res.status(409).json({ 
          error: 'Conflict', 
          message: 'Email already in use' 
        }); 
        return; 
      }
      
      // Hash password with bcrypt (12 rounds = very secure)
      console.log('[Signup] Hashing password...');
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Create new user in database
      console.log('[Signup] Creating user...');
      const user = await User.create({ name, email, passwordHash });
      
      // Generate JWT token for automatic login
      const token = sign(user._id.toString(), user.email);
      console.log('[Signup] User created successfully:', { 
        id: user._id, 
        email: user.email 
      });
      
      // Return user data without password hash (security)
      const userResponse = {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatarColor: user.avatarColor,
        createdAt: user.createdAt
      };
      
      res.status(201).json({ token, user: userResponse });
    } catch (e) { 
      console.error('[Signup] Error:', e);
      next(e); 
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

/**
 * Authenticate Existing User
 * 
 * Request Body:
 *   - email: Email address (required, valid email format)
 *   - password: Password (required, non-empty)
 * 
 * Response Success (200):
 *   { token: "jwt-token", user: {...} }
 * 
 * Response Errors:
 *   - 422: Validation failed (invalid input)
 *   - 401: Invalid credentials (wrong email or password)
 *   - 500: Server error
 */
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),      // Must be valid email
    body('password').notEmpty()                    // Password required
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    console.log('[Login] Received request:', { email: req.body.email });
    
    // Validate input fields
    const errs = validationResult(req);
    if (!errs.isEmpty()) { 
      console.log('[Login] Validation errors:', errs.array());
      res.status(422).json({ errors: errs.array() }); 
      return; 
    }
    
    try {
      const { email, password } = req.body as { 
        email: string; 
        password: string 
      };
      
      // Find user by email (include passwordHash for comparison)
      // Note: .select('+passwordHash') needed because passwordHash has select: false
      const user = await User.findOne({ email }).select('+passwordHash');
      if (!user) {
        console.log('[Login] User not found:', email);
        res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Invalid credentials' 
        }); 
        return;
      }
      
      // Verify password against stored hash
      console.log('[Login] Verifying password...');
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        console.log('[Login] Invalid password for:', email);
        res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Invalid credentials' 
        }); 
        return;
      }
      
      // Generate JWT token
      const token = sign(user._id.toString(), user.email);
      console.log('[Login] Login successful:', { 
        id: user._id, 
        email: user.email 
      });
      
      // Return user data without password hash (security)
      const userResponse = {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatarColor: user.avatarColor,
        createdAt: user.createdAt
      };
      
      res.json({ token, user: userResponse });
    } catch (e) { 
      console.error('[Login] Error:', e);
      next(e); 
    }
  }
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

/**
 * Get Current Authenticated User
 * 
 * Requires: Authorization header with valid JWT token
 * 
 * Response Success (200):
 *   { user: {...} }
 * 
 * Response Errors:
 *   - 401: Not authenticated (invalid/missing token)
 *   - 404: User not found (deleted account)
 *   - 500: Server error
 */
router.get('/me', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is set by authGuard middleware
    const user = await User.findById(req.user!.userId);
    
    if (!user) {
      return next(createError('User not found', 404));
    }
    
    res.json({ user });
  } catch (e) { 
    next(e); 
  }
});

export default router;
