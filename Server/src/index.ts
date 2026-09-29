/**
 * SyncDoc Server - Main Entry Point
 * 
 * This file starts the entire server application.
 * It connects to MongoDB, sets up the HTTP server, and enables WebSocket for real-time collaboration.
 */

import 'dotenv/config'; // Load environment variables from .env file
import http from 'http';
import mongoose from 'mongoose';
import app from './app';
import { attachSocketIO } from './sockets/connectionHandler';

// Get configuration from environment variables
const PORT = parseInt(process.env.PORT || '3001', 10);
const MONGO_URI = process.env.MONGO_URI as string;
const JWT_SECRET = process.env.JWT_SECRET as string;

// Make sure all required configuration is provided
if (!MONGO_URI) { 
  console.error('Error: MONGO_URI is required in .env file');
  process.exit(1); 
}

if (!JWT_SECRET) { 
  console.error('Error: JWT_SECRET is required in .env file');
  process.exit(1); 
}

/**
 * Start the server and connect all services
 */
async function startServer() {
  try {
    // Step 1: Connect to MongoDB database
    await mongoose.connect(MONGO_URI);
    console.log(' MongoDB connected');
    
    // Step 2: Create HTTP server using our Express app
    const server = http.createServer(app);
    
    // Step 3: Attach WebSocket handler for real-time features
    attachSocketIO(server);
    
    // Step 4: Start listening for incoming requests
    server.listen(PORT, () => {
      console.log(`  Server running on http://localhost:${PORT}`);
      console.log(`  Health check available at: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    // If anything goes wrong during startup, log it and exit
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
