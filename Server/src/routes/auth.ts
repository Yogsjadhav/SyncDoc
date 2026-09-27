import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { authGuard } from '../middleware/authGuard';
import { createError } from '../middleware/errorHandler';

const router = express.Router();
const sign = (userId: string, email: string) =>
  jwt.sign({ userId, email }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

// POST /api/auth/signup
router.post('/signup',
  [body('name').trim().notEmpty(), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 6 })],
  async (req: Request, res: Response, next: NextFunction) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) { res.status(422).json({ errors: errs.array() }); return; }
    try {
      const { name, email, password } = req.body as { name: string; email: string; password: string };
      if (await User.findOne({ email })) { res.status(409).json({ error: 'Conflict', message: 'Email already in use' }); return; }
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email, passwordHash });
      res.status(201).json({ token: sign(user._id.toString(), user.email), user });
    } catch (e) { next(e); }
  }
);

// POST /api/auth/login
router.post('/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req: Request, res: Response, next: NextFunction) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) { res.status(422).json({ errors: errs.array() }); return; }
    try {
      const { email, password } = req.body as { email: string; password: string };
      const user = await User.findOne({ email }).select('+passwordHash');
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' }); return;
      }
      res.json({ token: sign(user._id.toString(), user.email), user });
    } catch (e) { next(e); }
  }
);

// GET /api/auth/me
router.get('/me', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) return next(createError('User not found', 404));
    res.json({ user });
  } catch (e) { next(e); }
});

export default router;
