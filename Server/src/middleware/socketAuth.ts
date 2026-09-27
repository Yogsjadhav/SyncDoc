import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AuthPayload } from './authGuard';

declare module 'socket.io' {
  interface Socket { user?: AuthPayload }
}

export function socketAuth(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) { next(new Error('UNAUTHORIZED')); return; }
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload;
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
}
