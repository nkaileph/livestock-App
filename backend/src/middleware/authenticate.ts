import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/tokenService';
import { User } from '../models/User';
import { TokenBlacklist } from '../models/TokenBlacklist';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
    }
    const token = authHeader.split(' ')[1];

    const blacklisted = await TokenBlacklist.findOne({ token, type: 'access' });
    if (blacklisted) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token revoked' } });

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId);
    if (!user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    if (!user.isActive || user.isBlocked)
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Account disabled' } });

    req.user = user;
    req.tokenId = token;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
};
