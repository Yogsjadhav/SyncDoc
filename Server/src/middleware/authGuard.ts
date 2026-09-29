/**
 * Authentication Guard Middleware
 * 
 * This protects routes by checking if the user has a valid JWT token.
 * If valid, it allows access and adds user info to the request.
 * If invalid, it blocks access with a 401 error.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Define what data is stored in the JWT token
export interface AuthPayload { 
  userId: string;  // User's ID from database
  email: string;   // User's email address
}

// Add user property to Express Request type
declare global {
  namespace Express {
    interface Request { 
      user?: AuthPayload  // Will contain user data after token verification
    }
  }
}

/**
 * Check if request has valid authentication token
 */
export function authGuard(req: Request, res: Response, next: NextFunction): void {
  // Get the Authorization header (format: "Bearer <token>")
  const header = req.headers.authorization;
  
  // Check if header exists and has the right format
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Missing Authorization header' 
    });
    return;
  }
  
  try {
    // Extract the token (remove "Bearer " prefix)
    const token = header.slice(7);
    
    // Verify the token signature and decode the payload
    // This will throw an error if token is invalid or expired
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload;
    
    // Token is valid! Add user info to request for route handlers to use
    req.user = payload;
    
    // Allow request to continue to the route handler
    next();
  } catch {
    // Token verification failed (invalid, expired, or tampered)
    res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Token invalid or expired' 
    });
  }
}
