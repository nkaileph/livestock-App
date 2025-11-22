import { Request } from 'express';
import { IUser } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      tokenId?: string;
    }
  }
}

export {}; // ensure this file is a module
