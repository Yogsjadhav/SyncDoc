# SyncDoc Client Architecture

## Quick Reference

This project follows a **four-layer architecture** for clean separation of concerns:

```
UI Layer (pages/, components/)
    ↓ uses
Hooks Layer (hooks/)
    ↓ uses
State Layer (store/)
    ↓ uses
API Layer (api/)
```

## Layers

### 1. UI Layer
**Location:** `src/pages/`, `src/components/`  
**Purpose:** Pure presentation - renders UI, handles user interactions  
**Rules:** 
- ✅ Use hooks for data and actions
- ❌ NO direct API calls
- ❌ NO direct store access

### 2. Hooks Layer
**Location:** `src/hooks/`  
**Purpose:** Business logic bridge between UI and State/API  
**Rules:**
- ✅ Call API services
- ✅ Update state stores
- ✅ Handle loading/error states
- ❌ NO UI rendering

### 3. State Layer
**Location:** `src/store/`  
**Purpose:** Global state management with Zustand  
**Rules:**
- ✅ Manage application state
- ✅ Provide state actions
- ❌ NO API calls
- ❌ NO business logic

### 4. API Layer
**Location:** `src/api/`  
**Purpose:** HTTP communication with backend  
**Rules:**
- ✅ Make HTTP requests
- ✅ Transform request/response data
- ❌ NO state management
- ❌ NO business logic

## Example Usage

### Authentication
```javascript
// In a component (UI Layer)
import { useAuth } from '../hooks';

function LoginPage() {
  const { login, loading, error } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(credentials);
    if (result.success) navigate('/dashboard');
  };
}
```

### Documents
```javascript
// In a component (UI Layer)
import { useDocuments } from '../hooks';

function DashboardPage() {
  const { documents, fetchDocuments, createDocument } = useDocuments();
  
  useEffect(() => {
    fetchDocuments();
  }, []);
  
  const handleCreate = async () => {
    const result = await createDocument({ title: 'New Doc' });
    if (result.success) navigate(`/doc/${result.document._id}`);
  };
}
```

## File Structure

```
src/
├── api/                     # API Layer
│   ├── client.js
│   ├── auth.service.js
│   ├── documents.service.js
│   └── index.js
├── store/                   # State Layer
│   ├── authStore.js
│   ├── documentStore.js
│   └── index.js
├── hooks/                   # Hooks Layer
│   ├── useAuth.js
│   ├── useDocuments.js
│   ├── useDocumentHistory.js
│   └── index.js
├── pages/                   # UI Layer
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   └── DashboardPage.jsx
└── components/              # UI Layer
    └── ...
```

## Key Hooks

### `useAuth()`
```javascript
{
  user, token, isAuthenticated, loading, error,
  signup, login, logout, refreshUser
}
```

### `useDocuments()`
```javascript
{
  documents, loading, error,
  fetchDocuments, createDocument, updateDocument,
  deleteDocument, duplicateDocument
}
```

### `useDocumentHistory(documentId)`
```javascript
{
  snapshots, currentSnapshot, loading, error,
  fetchHistory, loadSnapshot, restoreSnapshot
}
```

## Best Practices

✅ **DO:**
- Use hooks in UI components
- Keep each layer focused on its responsibility
- Handle errors at the appropriate layer
- Add logging for debugging

❌ **DON'T:**
- Call API services directly from UI
- Update stores directly from UI
- Make API calls from stores
- Skip layers

## For More Details

See the comprehensive architecture guide in the artifact or documentation.
