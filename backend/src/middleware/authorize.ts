import { Request, Response, NextFunction } from 'express';

type Role = 'farmer' | 'manager' | 'admin' | 'viewer';

export const authorize = (roles: Role[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing user' } });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
  }
  return next();
};
