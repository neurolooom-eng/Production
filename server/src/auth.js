// Authentication (JWT + bcrypt) and RBAC middleware.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db/connection.js';
import { audit } from './audit.js';

const JWT_SECRET = process.env.JWT_SECRET || 'vpms-dev-secret-change-me';
const TOKEN_TTL = '12h';

export function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10);
}

export function login(username, password) {
  const user = db().prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return null;
  }
  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role, name: user.full_name },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
  audit({ actor: user.username, action: 'LOGIN', resource: 'users', recordId: user.id, summary: 'User logged in' });
  return { token, user: publicUser(user) };
}

export function publicUser(u) {
  return { id: u.id, username: u.username, full_name: u.full_name, email: u.email, role: u.role, department: u.department };
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

// Role-based access check. roles=null means "any authenticated user".
export function can(user, roles) {
  if (!roles) return true;
  if (!user) return false;
  if (user.role === 'Admin') return true; // Admin is superuser.
  return roles.includes(user.role);
}

export function requireWrite(resource) {
  return (req, res, next) => {
    const roles = resource.permissions?.write ?? null;
    if (!can(req.user, roles)) {
      return res.status(403).json({ error: `Your role (${req.user.role}) cannot modify ${resource.plural}` });
    }
    if (resource.readOnly) return res.status(403).json({ error: `${resource.plural} is read-only` });
    next();
  };
}

export function requireRead(resource) {
  return (req, res, next) => {
    const roles = resource.permissions?.read ?? null;
    if (!can(req.user, roles)) {
      return res.status(403).json({ error: `Your role (${req.user.role}) cannot view ${resource.plural}` });
    }
    next();
  };
}
