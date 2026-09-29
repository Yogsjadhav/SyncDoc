import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { DocumentModel } from '../models/Document';
import { OpLog } from '../models/OpLog';
import { Snapshot } from '../models/Snapshot';
import { User } from '../models/User';
import { authGuard } from '../middleware/authGuard';
import { createError } from '../middleware/errorHandler';
import { createEmptyDocument } from '../merge-engine/types';

/**
 * Documents Router
 * 
 * Handles all document-related HTTP endpoints:
 * - List documents (owned and shared)
 * - Create new documents
 * - Update document metadata (title, collaborators)
 * - Delete documents
 * - Duplicate documents
 * - Access version history and snapshots
 */

const router = express.Router();

// Apply authentication middleware to all routes in this router
// Every request must include a valid JWT token
router.use(authGuard);

// ─── Role helpers ─────────────────────────────────────────────────────────────

/**
 * Role type definition
 * - owner: Can delete, share, and edit
 * - editor: Can edit document content
 * - viewer: Can only view document
 * - null: No access
 */
type Role = 'owner' | 'editor' | 'viewer' | null;

/**
 * Get document and determine user's role
 * 
 * @param docId - Document ID to check
 * @param userId - User ID making the request
 * @returns Object with document and user's role
 * @throws Error if document not found or invalid ID
 */
async function getDocRole(docId: string, userId: string) {
  // Validate MongoDB ObjectId format
  if (!Types.ObjectId.isValid(docId)) throw createError('Invalid id', 400);
  
  // Find document in database
  const doc = await DocumentModel.findById(docId);
  if (!doc) throw createError('Not found', 404);
  
  // Check if user is the owner
  if (doc.ownerId.toString() === userId) return { doc, role: 'owner' as Role };
  
  // Check if user is a collaborator and get their role
  const c = doc.collaborators.find(c => c.userId.toString() === userId);
  return { doc, role: (c?.role ?? null) as Role };
}

/**
 * Require minimum role for an operation
 * 
 * @param role - User's current role
 * @param min - Minimum required role (viewer < editor < owner)
 * @throws 403 Forbidden if user doesn't have required role
 */
function requireRole(role: Role, min: 'viewer' | 'editor' | 'owner') {
  // Role hierarchy: viewer < editor < owner
  const ord: Role[] = ['viewer', 'editor', 'owner'];
  
  // Check if user has sufficient permissions
  if (!role || ord.indexOf(role) < ord.indexOf(min)) {
    throw createError('Forbidden', 403);
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/documents
 * 
 * Get all documents accessible to the current user
 * Includes both owned documents and documents shared with the user
 * 
 * Response: { documents: Array<Document> }
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = new Types.ObjectId(req.user!.userId);
    
    // Find documents where user is either owner or collaborator
    const docs = await DocumentModel
      .find({ 
        $or: [
          { ownerId: uid },                    // Documents user owns
          { 'collaborators.userId': uid }      // Documents shared with user
        ] 
      })
      .select('-astSnapshot')                  // Exclude large AST data for performance
      .sort({ updatedAt: -1 })                 // Most recently updated first
      .lean();                                  // Return plain objects (faster)
    
    res.json({ documents: docs });
  } catch (e) { next(e); }
});

/**
 * POST /api/documents
 * 
 * Create a new document
 * 
 * Body: { title?: string }
 * Response: { document: Document }
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Create new document with empty content
    const doc = await DocumentModel.create({
      title: (req.body.title as string | undefined)?.trim() || 'Untitled',
      ownerId: req.user!.userId,
      astSnapshot: createEmptyDocument(),      // Initialize with empty AST
      version: 0,                              // Start at version 0
    });
    
    res.status(201).json({ document: doc });
  } catch (e) { next(e); }
});

/**
 * GET /api/documents/:id
 * 
 * Get a specific document by ID
 * User must have at least viewer access
 * 
 * Response: { document: Document, role: Role }
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get document and check user's permission
    const { doc, role } = await getDocRole(req.params.id, req.user!.userId);
    requireRole(role, 'viewer');              // Minimum: viewer access
    
    res.json({ document: doc, role });
  } catch (e) { next(e); }
});

/**
 * PATCH /api/documents/:id
 * 
 * Update document metadata (title and/or collaborators)
 * Only document owner can update
 * 
 * Body: { 
 *   title?: string, 
 *   collaborators?: Array<{ email: string, role: 'viewer'|'editor' }> 
 * }
 * Response: { document: Document }
 */
router.patch('/:id',
  [
    body('title').optional().trim().isLength({ max: 500 }),
    body('collaborators').optional().isArray()
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    // Validate input
    const errs = validationResult(req);
    if (!errs.isEmpty()) { 
      res.status(422).json({ errors: errs.array() }); 
      return; 
    }
    
    try {
      const { doc, role } = await getDocRole(req.params.id, req.user!.userId);
      requireRole(role, 'owner');             // Only owner can update metadata
      
      const { title, collaborators } = req.body as { 
        title?: string; 
        collaborators?: { email: string; role: 'viewer'|'editor' }[] 
      };
      
      // Update title if provided
      if (title !== undefined) doc.title = title.trim();
      
      // Update collaborators if provided
      if (collaborators !== undefined) {
        // Resolve email addresses to user IDs
        const resolved = await Promise.all(collaborators.map(async c => {
          const u = await User.findOne({ email: c.email.toLowerCase() });
          if (!u) throw createError(`User not found: ${c.email}`, 404);
          
          // Don't add owner as collaborator
          if (u._id.toString() === doc.ownerId.toString()) return null;
          
          return { userId: u._id, role: c.role };
        }));
        
        // Filter out null values (owner) and update collaborators list
        doc.collaborators = resolved.filter(Boolean) as typeof doc.collaborators;
      }
      
      await doc.save();
      res.json({ document: doc });
    } catch (e) { next(e); }
  }
);

/**
 * DELETE /api/documents/:id
 * 
 * Delete a document and all associated data
 * Only document owner can delete
 * Also removes: operation logs, snapshots
 * 
 * Response: 204 No Content
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { doc, role } = await getDocRole(req.params.id, req.user!.userId);
    requireRole(role, 'owner');               // Only owner can delete
    
    // Delete document and all related data in parallel
    await Promise.all([
      DocumentModel.findByIdAndDelete(doc._id),
      OpLog.deleteMany({ documentId: doc._id }),      // Delete operation history
      Snapshot.deleteMany({ documentId: doc._id }),   // Delete version snapshots
    ]);
    
    res.status(204).send();
  } catch (e) { next(e); }
});

/**
 * POST /api/documents/:id/duplicate
 * 
 * Create a copy of an existing document
 * User must have at least viewer access to source document
 * New document is owned by the requesting user
 * 
 * Response: { document: Document }
 */
router.post('/:id/duplicate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { doc, role } = await getDocRole(req.params.id, req.user!.userId);
    requireRole(role, 'viewer');              // Need viewer access to duplicate
    
    // Create new document with copied content
    const copy = await DocumentModel.create({
      title: `${doc.title} (copy)`,
      ownerId: req.user!.userId,              // Requesting user owns the copy
      astSnapshot: doc.astSnapshot,           // Copy current content
      version: 0,                             // Start fresh version counter
    });
    
    res.status(201).json({ document: copy });
  } catch (e) { next(e); }
});

/**
 * GET /api/documents/:id/history
 * 
 * Get list of all snapshots for a document
 * Snapshots are saved automatically every 100 versions
 * Returns metadata only (no AST content)
 * 
 * Response: { snapshots: Array<Snapshot> }
 */
router.get('/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = await getDocRole(req.params.id, req.user!.userId);
    requireRole(role, 'viewer');              // Viewer can see history
    
    // Get all snapshots, exclude large AST field, sort by version (newest first)
    const snapshots = await Snapshot
      .find({ documentId: req.params.id })
      .select('-ast')                         // Exclude AST for performance
      .sort({ version: -1 });
    
    res.json({ snapshots });
  } catch (e) { next(e); }
});

/**
 * GET /api/documents/:id/history/:snapId
 * 
 * Get a specific snapshot with full AST content
 * Used to preview or restore a previous version
 * 
 * Response: { snapshot: Snapshot }
 */
router.get('/:id/history/:snapId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = await getDocRole(req.params.id, req.user!.userId);
    requireRole(role, 'viewer');
    
    // Find specific snapshot
    const snap = await Snapshot.findOne({ 
      _id: req.params.snapId, 
      documentId: req.params.id 
    });
    
    if (!snap) return next(createError('Snapshot not found', 404));
    
    res.json({ snapshot: snap });
  } catch (e) { next(e); }
});

/**
 * POST /api/documents/:id/history/:snapId/restore
 * 
 * Restore document to a previous snapshot
 * Creates new version with restored content
 * User must have editor access
 * 
 * Response: { document: Document, restoredVersion: number }
 */
router.post('/:id/history/:snapId/restore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { doc, role } = await getDocRole(req.params.id, req.user!.userId);
    requireRole(role, 'editor');              // Need editor access to restore
    
    // Find the snapshot to restore
    const snap = await Snapshot.findOne({ 
      _id: req.params.snapId, 
      documentId: req.params.id 
    });
    
    if (!snap) return next(createError('Snapshot not found', 404));
    
    // Create new version number
    const newVersion = doc.version + 1;
    
    // Log the restore operation
    await OpLog.create({ 
      documentId: doc._id, 
      version: newVersion, 
      userId: req.user!.userId, 
      ops: [{ op: 'restore', fromVersion: snap.version }] 
    });
    
    // Update document with snapshot content
    doc.astSnapshot = snap.ast;
    doc.version = newVersion;
    await doc.save();
    
    res.json({ document: doc, restoredVersion: snap.version });
  } catch (e) { next(e); }
});

export default router;
