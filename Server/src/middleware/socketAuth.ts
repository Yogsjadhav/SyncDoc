/**
 * WebSocket Authentication Middleware
 * 
 * Similar to authGuard, but for WebSocket connections instead of HTTP requests.
 * Validates JWT token when client tries to connect via Socket.IO.
 */

import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AuthPayload } from './authGuard';

// Add user property to Socket.IO Socket type
declare module 'socket.io' {
  interface Socket { 
    user?: AuthPayload  // Will contain user data after token verification
  }
}

/**
 * Authenticate WebSocket connection
 */
export function socketAuth(socket: Socket, next: (err?: Error) => void): void {
  // Get token from socket handshake
  // Client sends: io(url, { auth: { token: "..." } })
  const token = socket.handshake.auth?.token as string | undefined;
  
  // If no token provided, reject the connection
  if (!token) { 
    next(new Error('UNAUTHORIZED')); 
    return; 
  }
  
  try {
    // Verify the token and decode user data
    socket.user = jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload;
    
    // Token is valid, allow the connection
    next();
  } catch {
    // Token is invalid, reject the connection
    next(new Error('UNAUTHORIZED'));
  }
}
