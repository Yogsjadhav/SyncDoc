# SyncDoc - Complete Code Documentation

This document explains every major file and function in the SyncDoc project.

## 📁 Project Structure

```
SyncDoc/
├── Client/          # Frontend React application
│   ├── src/
│   │   ├── api/            # Layer 4: HTTP API calls
│   │   ├── store/          # Layer 3: State management (Zustand)
│   │   ├── hooks/          # Layer 2: Custom React hooks
│   │   ├── pages/          # Layer 1: Page components
│   │   ├── components/     # Layer 1: Reusable UI components
│   │   └── lib/            # Utility functions
│   └── ...
└── Server/          # Backend Node.js/Express application
    ├── src/
    │   ├── routes/         # HTTP API endpoints
    │   ├── models/         # MongoDB schemas
    │   ├── middleware/     # Request processing
    │   ├── sockets/        # WebSocket handlers
    │   ├── merge-engine/   # OT algorithm
    │   └── utils/          # Helper functions
    └── ...
```

---

## 🖥️ SERVER FILES

### Core Files

#### `src/index.ts` - Server Entry Point
**Purpose:** Starts the server and initializes all services

**What it does:**
1. Loads environment variables from `.env` file
2. Validates required config (MONGO_URI, JWT_SECRET, PORT)
3. Connects to MongoDB database
4. Creates HTTP server with Express
5. Attaches Socket.IO for real-time features
6. Starts listening on configured port

**Key Functions:**
- `main()` - Main initialization function
  - Connects to MongoDB
  - Sets up HTTP server
  - Initializes WebSocket server
  - Starts listening for requests

---

#### `src/app.ts` - Express Application Setup
**Purpose:** Configures the Express app with middleware and routes

**What it does:**
1. Applies security middleware (Helmet)
2. Configures CORS for frontend access
3. Sets up JSON body parsing
4. Registers API routes
5. Adds global error handler

**Routes registered:**
- `GET /health` - Health check endpoint
- `/api/auth/*` - Authentication routes
- `/api/documents/*` - Document CRUD routes

---

### Middleware

#### `src/middleware/authGuard.ts` - HTTP Authentication
**Purpose:** Protects routes by verifying JWT tokens

**How it works:**
1. Extracts token from `Authorization: Bearer <token>` header
2. Verifies token signature using JWT_SECRET
3. Decodes user ID and email from token
4. Attaches `req.user` for route handlers to use
5. Returns 401 if token is missing/invalid

**Usage:**
```typescript
router.use(authGuard);  // Protect all routes
router.get('/protected', authGuard, handler);  // Protect single route
```

---

#### `src/middleware/socketAuth.ts` - WebSocket Authentication
**Purpose:** Authenticates WebSocket connections

**How it works:**
1. Client connects: `io(url, { auth: { token: "..." } })`
2. Middleware extracts token from handshake
3. Verifies JWT token
4. If valid: allows connection, attaches `socket.user`
5. If invalid: rejects connection

---

#### `src/middleware/errorHandler.ts` - Global Error Handler
**Purpose:** Catches and formats all errors

**Functions:**
- `errorHandler()` - Express error middleware
  - Formats errors as JSON
  - Logs 500 errors
  - Hides internal details from clients

- `createError(message, statusCode)` - Helper to create errors
  ```typescript
  throw createError('Not found', 404);
  throw createError('Forbidden', 403);
  ```

---

### Models (Database Schemas)

#### `src/models/User.ts` - User Accounts
**Purpose:** Stores user account information

**Fields:**
- `name` - Full name (string, required)
- `email` - Email address (unique, lowercase)
- `passwordHash` - Bcrypt hashed password (select: false for security)
- `avatarColor` - Random hex color for avatar
- `createdAt` - Account creation timestamp

**Security Features:**
- Password hash excluded from queries by default
- Password hash removed from JSON responses
- Email stored in lowercase for case-insensitive matching

---

#### `src/models/Document.ts` - Documents
**Purpose:** Stores document metadata and content

**Fields:**
- `title` - Document title (user can rename)
- `ownerId` - Reference to User who created it
- `collaborators[]` - Array of {userId, role}
  - role: 'viewer' | 'editor'
- `version` - Current version number
- `astSnapshot` - Current document content (AST)
- `createdAt`/`updatedAt` - Timestamps

**Indexes:**
- `{ownerId, updatedAt}` - Find user's documents
- `{collaborators.userId, updatedAt}` - Find shared documents

---

### Routes (API Endpoints)

#### `src/routes/auth.ts` - Authentication API
**Endpoints:**

**POST /api/auth/signup** - Create account
- Input: `{ name, email, password }`
- Validates input
- Checks if email exists
- Hashes password with bcrypt (12 rounds)
- Creates user in database
- Returns JWT token and user data

**POST /api/auth/login** - Log in
- Input: `{ email, password }`
- Finds user by email
- Verifies password with bcrypt
- Returns JWT token and user data

**GET /api/auth/me** - Get current user
- Requires: JWT token in Authorization header
- Returns: Current user data

---

#### `src/routes/documents.ts` - Document API
**Helper Functions:**

**getDocRole(docId, userId)**
- Finds document by ID
- Determines user's role (owner/editor/viewer)
- Returns `{ doc, role }`

**requireRole(role, min)**
- Checks if user has sufficient permissions
- Throws 403 if insufficient

**Endpoints:**

**GET /api/documents**
- Lists all accessible documents
- Returns owned + shared documents

**POST /api/documents**
- Creates new document
- Input: `{ title }` (optional)
- Returns created document

**GET /api/documents/:id**
- Gets single document
- Requires viewer access
- Returns document + user's role

**PATCH /api/documents/:id**
- Updates title or collaborators
- Requires owner access
- Input: `{ title?, collaborators? }`

**DELETE /api/documents/:id**
- Deletes document
- Requires owner access
- Also deletes OpLog and Snapshots

**POST /api/documents/:id/duplicate**
- Creates copy of document
- Requires viewer access
- New document owned by requester

**GET /api/documents/:id/history**
- Lists version snapshots
- Requires viewer access

**GET /api/documents/:id/history/:snapId**
- Gets specific snapshot
- Includes full AST content

**POST /api/documents/:id/history/:snapId/restore**
- Restores document to snapshot
- Requires editor access
- Creates new version with restored content

---

### Sockets (Real-time Communication)

#### `src/sockets/connectionHandler.ts` - WebSocket Setup
**Purpose:** Manages WebSocket connections and events

**Functions:**

**attachSocketIO(server)**
- Creates Socket.IO server
- Applies socketAuth middleware
- Sets up event handlers
- Configures CORS

**Events Handled:**
- `join-document` - User joins document room
- `leave-document` - User leaves document
- `submit-op` - User submits edit operation
- `presence-update` - User moves cursor
- `sync-request` - Request current document state
- `disconnect` - User disconnects

---

#### `src/sockets/opHandler.ts` - Operation Handler
**Purpose:** Processes collaborative edits with conflict resolution

**handleSubmitOp(io, socket, payload)**
- Receives operation from client
- Acquires document mutex (prevents race conditions)
- Fetches committed operations since baseVersion
- Rebases operation if conflicts exist
- Applies operation to AST
- Saves to OpLog
- Broadcasts to all users
- Maybe saves snapshot (every 100 versions)

---

#### `src/sockets/roomManager.ts` - Presence Management
**Purpose:** Tracks users in each document

**Functions:**
- `add(docId, member)` - Add user to document room
- `remove(docId, userId)` - Remove user from room
- `removeBySocket(socketId)` - Remove by socket ID
- `updatePresence(docId, userId, cursor, selection)` - Update cursor position
- `getUsers(docId)` - Get all users in room
- `count(docId)` - Count users in room

---

### Utils

#### `src/utils/docMutex.ts` - Document Locking
**Purpose:** Prevents race conditions during edits

**Functions:**
- `getMutex(documentId)` - Get/create mutex for document
- `cleanupMutex(documentId)` - Remove mutex when done

**Usage:**
```typescript
const release = await getMutex(docId).acquire();
try {
  // ... modify document ...
} finally {
  release();
}
```

---

#### `src/utils/snapshotScheduler.ts` - Auto Snapshots
**Purpose:** Saves document snapshots periodically

**Functions:**

**maybeSaveSnapshot(documentId, version, ast)**
- Saves snapshot every 100 versions
- Creates Snapshot document in database
- Logs success/failure

**createManualSnapshot(documentId, version, ast, label)**
- Creates user-initiated snapshot
- Allows custom label

---

## 💻 CLIENT FILES

### API Layer (src/api/)

#### `src/api/client.js` - Axios Instance
**Purpose:** Base HTTP client for all API calls

**Features:**
- Configures base URL from environment
- Attaches JWT token to all requests
- Logs requests and responses
- Auto-logout on 401 errors

**Interceptors:**
- **Request:** Adds `Authorization: Bearer <token>` header
- **Response:** Handles 401 by clearing auth and redirecting

---

#### `src/api/auth.service.js` - Auth API
**Functions:**

**signup(credentials)**
- POST /api/auth/signup
- Creates new account
- Returns `{ token, user }`

**login(credentials)**
- POST /api/auth/login
- Authenticates user
- Returns `{ token, user }`

**getCurrentUser()**
- GET /api/auth/me
- Gets current user data

**logout()**
- Clears localStorage
- Redirects to /login

---

#### `src/api/documents.service.js` - Documents API
**Functions:**

- `getDocuments()` - List all documents
- `getDocument(id)` - Get single document
- `createDocument(data)` - Create new document
- `updateDocument(id, updates)` - Update metadata
- `deleteDocument(id)` - Delete document
- `duplicateDocument(id)` - Copy document
- `getDocumentHistory(id)` - List snapshots
- `getSnapshot(id, snapId)` - Get specific snapshot
- `restoreSnapshot(id, snapId)` - Restore old version

---

### State Layer (src/store/)

#### `src/store/authStore.js` - Authentication State
**Purpose:** Manages user authentication state (persisted)

**State:**
- `user` - Current user object
- `token` - JWT token string
- `isAuthenticated` - Computed boolean

**Actions:**
- `setAuth(user, token)` - Store auth data
- `logout()` - Clear auth data
- `updateUser(updates)` - Update user info

---

#### `src/store/documentStore.js` - Document State
**Purpose:** Manages current document editing state

**State:**
- `document` - Document metadata
- `ast` - Document content (AST)
- `version` - Current version number
- `localOps[]` - Pending operations queue
- `presence` - Map of collaborators
- `conflicts[]` - Conflict notifications
- `role` - User's role in document

**Actions:**
- `setDocument/setAst/setVersion/setRole` - Update state
- `pushLocalOp(op)` - Add operation to queue
- `flushLocalOps()` - Get and clear queue
- `setPresenceUser/removePresenceUser` - Manage presence
- `addConflict/dismissConflict` - Handle conflicts
- `reset()` - Clear all state

---

### Hooks Layer (src/hooks/)

#### `src/hooks/useAuth.js`
**Purpose:** Authentication operations

**Returns:**
- State: `user, token, isAuthenticated, loading, error`
- Actions: `signup, login, logout, refreshUser`

**Usage:**
```jsx
const { login, loading, error } = useAuth();
await login({ email, password });
```

---

#### `src/hooks/useDocuments.js`
**Purpose:** Document list management

**Returns:**
- State: `documents, loading, error`
- Actions: `fetchDocuments, createDocument, updateDocument, deleteDocument, duplicateDocument`

**Usage:**
```jsx
const { documents, fetchDocuments } = useDocuments();
useEffect(() => { fetchDocuments(); }, []);
```

---

#### `src/hooks/useDocumentHistory.js`
**Purpose:** Version history operations

**Returns:**
- State: `snapshots, currentSnapshot, loading, error`
- Actions: `fetchHistory, loadSnapshot, restoreSnapshot`

---

### Pages (src/pages/)

#### `src/pages/LoginPage.jsx`
**Purpose:** Login form UI

**What it does:**
1. Renders login form
2. Uses `useAuth()` hook
3. Calls `login()` on submit
4. Redirects to dashboard on success

---

#### `src/pages/SignupPage.jsx`
**Purpose:** Registration form UI

**What it does:**
1. Renders signup form with validation
2. Uses `useAuth()` hook
3. Calls `signup()` on submit
4. Redirects to dashboard on success

---

#### `src/pages/DashboardPage.jsx`
**Purpose:** Document list view

**What it does:**
1. Fetches user's documents
2. Shows owned and shared documents
3. Search/filter functionality
4. Create/rename/delete/duplicate actions
5. Share modal for collaboration

**Uses:**
- `useAuth()` - Get current user, logout
- `useDocuments()` - CRUD operations

---

## 🔑 Key Concepts

### JWT Authentication
1. User logs in with email/password
2. Server verifies and generates JWT token
3. Client stores token in localStorage
4. Token attached to every request
5. Server verifies token on protected routes

### Four-Layer Architecture (Client)
```
UI → Hooks → State → API
```
- **UI:** Pure presentation (components, pages)
- **Hooks:** Business logic bridge
- **State:** Global state management
- **API:** HTTP communication

### Operational Transformation (OT)
1. Multiple users edit simultaneously
2. Each edit creates an operation
3. Operations sent to server
4. Server rebases concurrent operations
5. Resolves conflicts automatically
6. Broadcasts resolved operations
7. All clients converge to same state

### Real-time Collaboration
1. Client connects via WebSocket
2. Joins document "room"
3. Sends operations when editing
4. Receives operations from others
5. Shows presence (cursors, selections)
6. Updates in real-time

---

## 🚀 Quick Reference

### Start Development
```bash
# Server
cd Server
npm run dev

# Client
cd Client  
npm run dev
```

### Environment Variables
**Server (.env):**
```
PORT=3000
MONGO_URI=mongodb://localhost:27017/syncdoc
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:5173
```

**Client (.env):**
```
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

### Common Tasks

**Add new API endpoint:**
1. Add route in `Server/src/routes/`
2. Add service function in `Client/src/api/`
3. Add hook if needed in `Client/src/hooks/`
4. Use in component

**Add authentication:**
```typescript
// Protect route
router.use(authGuard);

// In component
const { isAuthenticated } = useAuth();
if (!isAuthenticated) navigate('/login');
```

**Access current user:**
```typescript
// Server
const userId = req.user.userId;

// Client
const { user } = useAuth();
```

---

## 📚 Further Reading

- **MongoDB:** Database operations
- **Express:** HTTP routing
- **Socket.IO:** WebSocket communication
- **React:** UI framework
- **Zustand:** State management
- **Operational Transformation:** Conflict resolution algorithm

---

*This documentation covers the core functionality. For specific implementation details, see inline code comments.*
