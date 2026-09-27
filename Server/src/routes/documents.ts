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

const router = express.Router();
router.use(authGuard);

// ─── Role helpers ─────────────────────────────────────────────────────────────
type Role = 'owner' | 'editor' | 'viewer' | null;

async function getDocRole(docId: string, userId: string) {
  if (!Types.ObjectId.isValid(docId)) throw createError('Invalid id', 400);
  const doc = await DocumentModel.findById(docId);
  if (!doc) throw createError('Not found', 404);
  if (doc.ownerId.toString() === userId) return { doc, role: 'owner' as Role };
  const c = doc.collaborators.find(c => c.userId.toString() === userId);
  return { doc, role: (c?.role ?? null) as Role };
}

function require(role: Role, min: 'viewer' | 'editor' | 'owner') {
  const ord: Role[] = ['viewer', 'editor', 'owner'];
  if (!role || ord.indexOf(role) < ord.indexOf(min)) throw createError('Forbidden', 403);
}

// GET /api/documents
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = new Types.ObjectId(req.user!.userId);
    const docs = await DocumentModel
      .find({ $or: [{ ownerId: uid }, { 'collaborators.userId': uid }] })
      .select('-astSnapshot').sort({ updatedAt: -1 }).lean();
    res.json({ documents: docs });
  } catch (e) { next(e); }
});

// POST /api/documents
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await DocumentModel.create({
      title: (req.body.title as string | undefined)?.trim() || 'Untitled',
      ownerId: req.user!.userId,
      astSnapshot: createEmptyDocument(),
      version: 0,
    });
    res.status(201).json({ document: doc });
  } catch (e) { next(e); }
});

// GET /api/documents/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { doc, role } = await getDocRole(req.params.id, req.user!.userId);
    require(role, 'viewer');
    res.json({ document: doc, role });
  } catch (e) { next(e); }
});

// PATCH /api/documents/:id  (rename + share)
router.patch('/:id',
  [body('title').optional().trim().isLength({ max: 500 }), body('collaborators').optional().isArray()],
  async (req: Request, res: Response, next: NextFunction) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) { res.status(422).json({ errors: errs.array() }); return; }
    try {
      const { doc, role } = await getDocRole(req.params.id, req.user!.userId);
      require(role, 'owner');
      const { title, collaborators } = req.body as { title?: string; collaborators?: { email: string; role: 'viewer'|'editor' }[] };
      if (title !== undefined) doc.title = title.trim();
      if (collaborators !== undefined) {
        const resolved = await Promise.all(collaborators.map(async c => {
          const u = await User.findOne({ email: c.email.toLowerCase() });
          if (!u) throw createError(`User not found: ${c.email}`, 404);
          if (u._id.toString() === doc.ownerId.toString()) return null;
          return { userId: u._id, role: c.role };
        }));
        doc.collaborators = resolved.filter(Boolean) as typeof doc.collaborators;
      }
      await doc.save();
      res.json({ document: doc });
    } catch (e) { next(e); }
  }
);

// DELETE /api/documents/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { doc, role } = await getDocRole(req.params.id, req.user!.userId);
    require(role, 'owner');
    await Promise.all([
      DocumentModel.findByIdAndDelete(doc._id),
      OpLog.deleteMany({ documentId: doc._id }),
      Snapshot.deleteMany({ documentId: doc._id }),
    ]);
    res.status(204).send();
  } catch (e) { next(e); }
});

// POST /api/documents/:id/duplicate
router.post('/:id/duplicate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { doc, role } = await getDocRole(req.params.id, req.user!.userId);
    require(role, 'viewer');
    const copy = await DocumentModel.create({
      title: `${doc.title} (copy)`,
      ownerId: req.user!.userId,
      astSnapshot: doc.astSnapshot,
      version: 0,
    });
    res.status(201).json({ document: copy });
  } catch (e) { next(e); }
});

// GET /api/documents/:id/history
router.get('/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = await getDocRole(req.params.id, req.user!.userId);
    require(role, 'viewer');
    const snapshots = await Snapshot.find({ documentId: req.params.id }).select('-ast').sort({ version: -1 });
    res.json({ snapshots });
  } catch (e) { next(e); }
});

// GET /api/documents/:id/history/:snapId
router.get('/:id/history/:snapId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = await getDocRole(req.params.id, req.user!.userId);
    require(role, 'viewer');
    const snap = await Snapshot.findOne({ _id: req.params.snapId, documentId: req.params.id });
    if (!snap) return next(createError('Snapshot not found', 404));
    res.json({ snapshot: snap });
  } catch (e) { next(e); }
});

// POST /api/documents/:id/history/:snapId/restore
router.post('/:id/history/:snapId/restore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { doc, role } = await getDocRole(req.params.id, req.user!.userId);
    require(role, 'editor');
    const snap = await Snapshot.findOne({ _id: req.params.snapId, documentId: req.params.id });
    if (!snap) return next(createError('Snapshot not found', 404));
    const newVersion = doc.version + 1;
    await OpLog.create({ documentId: doc._id, version: newVersion, userId: req.user!.userId, ops: [{ op: 'restore', fromVersion: snap.version }] });
    doc.astSnapshot = snap.ast;
    doc.version = newVersion;
    await doc.save();
    res.json({ document: doc, restoredVersion: snap.version });
  } catch (e) { next(e); }
});

export default router;
