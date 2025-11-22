import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const verifyAccessToken = (token: string) => jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
export const verifyRefreshToken = (token: string) => jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
