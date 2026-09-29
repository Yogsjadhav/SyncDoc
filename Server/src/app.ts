/**
 * Express Application Setup
 * 
 * This file configures the Express application with all necessary middleware and routes.
 * Think of this as the main configuration hub for handling HTTP requests.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRouter from './routes/auth';
import documentRouter from './routes/documents';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security: Helmet adds security headers to protect against common vulnerabilities
app.use(helmet());
app.get('/', (_req, res) => {
  res.json({
    message: 'SyncDoc Server is running',
    status: 'success'
  });
});

// CORS: Allow frontend to make requests from a different domain (cross-origin requests)
app.use(cors({ 
  origin: process.env.CLIENT_URL || 'http://localhost:5173', // Frontend URL
  credentials: true // Allow cookies and auth headers
}));

// Body Parser: Parse incoming JSON data in request body (limit: 5mb)
app.use(express.json({ limit: '5mb' }));

// Health Check: Simple endpoint to verify server is running
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Authentication Routes: Handle signup, login, and user profile
app.use('/api/auth', authRouter);

// Document Routes: Handle all document CRUD operations
app.use('/api/documents', documentRouter);

// Error Handler: Catch and format all errors from routes
app.use(errorHandler);

export default app;
