import type { NextApiRequest, NextApiResponse } from 'next';
import {
  isUserAccountsEnabled,
  getSessionFromCookie,
  hasPermission,
  createUserAccount,
  hashPassword,
} from '../../lib/authEnhanced';
import { getAllUsers, getUserById, updateUser, deleteUser, type User } from '../../lib/db';

type ApiError = { error: string; message?: string };
type UserResponse = Omit<User, 'passwordHash'>;

const sanitizeUser = (user: User): UserResponse => {
  const { passwordHash: _, ...safe } = user;
  return safe;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserResponse | UserResponse[] | ApiError | { success: boolean }>
) {
  if (!isUserAccountsEnabled()) {
    return res.status(404).json({ error: 'not_found', message: 'User accounts are not enabled' });
  }

  const session = getSessionFromCookie(req.headers.cookie);
  if (!session) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { user } = session;

  switch (req.method) {
    case 'GET': {
      if (!hasPermission(user, 'users:view')) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const { id } = req.query;
      if (id && typeof id === 'string') {
        const targetUser = getUserById(parseInt(id, 10));
        if (!targetUser) {
          return res.status(404).json({ error: 'not_found' });
        }
        return res.json(sanitizeUser(targetUser));
      }

      const users = getAllUsers();
      return res.json(users.map(sanitizeUser));
    }

    case 'POST': {
      if (!hasPermission(user, 'users:manage')) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const { email, password, name, role } = req.body as {
        email?: string;
        password?: string;
        name?: string;
        role?: User['role'];
      };

      if (!email || !password) {
        return res.status(400).json({ error: 'validation_error', message: 'Email and password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'validation_error', message: 'Password must be at least 8 characters' });
      }

      try {
        const newUser = await createUserAccount({ email, password, name, role });
        return res.status(201).json(sanitizeUser(newUser));
      } catch (error) {
        if ((error as Error).message?.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'conflict', message: 'Email already exists' });
        }
        throw error;
      }
    }

    case 'PUT': {
      if (!hasPermission(user, 'users:manage')) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'validation_error', message: 'User ID is required' });
      }

      const userId = parseInt(id, 10);
      const targetUser = getUserById(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'not_found' });
      }

      const { email, password, name, role, isActive } = req.body as {
        email?: string;
        password?: string;
        name?: string;
        role?: User['role'];
        isActive?: boolean;
      };

      const updates: Parameters<typeof updateUser>[1] = {};

      if (email !== undefined) updates.email = email.toLowerCase();
      if (name !== undefined) updates.name = name;
      if (role !== undefined) updates.role = role;
      if (isActive !== undefined) updates.isActive = isActive;
      if (password) {
        if (password.length < 8) {
          return res.status(400).json({ error: 'validation_error', message: 'Password must be at least 8 characters' });
        }
        updates.passwordHash = await hashPassword(password);
      }

      const success = updateUser(userId, updates);
      if (!success) {
        return res.status(500).json({ error: 'update_failed' });
      }

      const updatedUser = getUserById(userId)!;
      return res.json(sanitizeUser(updatedUser));
    }

    case 'DELETE': {
      if (!hasPermission(user, 'users:manage')) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'validation_error', message: 'User ID is required' });
      }

      const userId = parseInt(id, 10);

      // Prevent self-deletion
      if (userId === user.id) {
        return res.status(400).json({ error: 'validation_error', message: 'Cannot delete your own account' });
      }

      const success = deleteUser(userId);
      if (!success) {
        return res.status(404).json({ error: 'not_found' });
      }

      return res.json({ success: true });
    }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).json({ error: 'method_not_allowed' });
  }
}
