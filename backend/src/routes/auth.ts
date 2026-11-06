import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { authenticateToken, requireOwner, AuthRequest } from '../middlewares/auth';

const router = Router();

// Seed default owner account if no users exist
router.post('/seed-owner', async (req: Request, res: Response) => {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return res.status(400).json({ message: 'Owner already configured' });
    }

    const { username, password, fullName } = req.body;
    const passwordHash = await bcrypt.hash(password || 'admin123', 10);

    const owner = await prisma.user.create({
      data: {
        username: username || 'owner',
        passwordHash,
        fullName: fullName || 'Business Owner',
        role: 'OWNER',
        isActive: true,
      },
    });

    return res.json({ message: 'Owner account created successfully', username: owner.username });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// User login (supports username OR email)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const identifier = (req.body.username || req.body.email || '').trim();
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username or Email Address and password required' });
    }

    // Search by username OR email (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: identifier, mode: 'insensitive' } },
          { email: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const secret = process.env.JWT_SECRET || 'supersecretkey';
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role, permissions: user.permissions },
      secret,
      { expiresIn: '12h' }
    );

    // Audit login
    await prisma.auditEvent.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        details: { identifier, username: user.username, email: user.email },
      },
    });

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Get current profile
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        fullName: true,
        role: true,
        isActive: true,
        permissions: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Update own profile (Owner or Operator)
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { fullName, email, phone } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // If updating email, check for conflicts with other users
    if (email && email.trim()) {
      const trimmedEmail = email.trim().toLowerCase();
      const existing = await prisma.user.findFirst({
        where: {
          email: { equals: trimmedEmail, mode: 'insensitive' },
          NOT: { id: userId },
        },
      });
      if (existing) {
        return res.status(400).json({ error: 'This email address is already in use by another account' });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: fullName !== undefined ? fullName.trim() : undefined,
        email: email !== undefined ? (email.trim() ? email.trim().toLowerCase() : null) : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        fullName: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
      },
    });

    // Audit profile update
    await prisma.auditEvent.create({
      data: {
        userId,
        action: 'UPDATE_PROFILE',
        entity: 'User',
        entityId: userId,
        details: { fullName: updated.fullName, email: updated.email, phone: updated.phone },
      },
    });

    return res.json({
      message: 'Profile updated successfully',
      user: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Change own password
router.put('/change-password', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password does not match' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Audit password change
    await prisma.auditEvent.create({
      data: {
        userId,
        action: 'CHANGE_PASSWORD',
        entity: 'User',
        entityId: userId,
        details: { username: user.username },
      },
    });

    return res.json({ message: 'Password changed successfully. You can now use your new password.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// List users (Owner only)
router.get('/users', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(users);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Create new operator (Owner only)
router.post('/users', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, fullName, role, permissions } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({ error: 'Username, password and fullName required' });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash,
        fullName,
        role: role || 'OPERATOR',
        permissions: permissions || {},
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
      },
    });

    return res.json(newUser);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Toggle user status (Activate/Deactivate)
router.patch('/users/:id/status', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, username: true, isActive: true },
    });

    return res.json(updatedUser);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
