import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse({ ...req.body, ...req.params, ...req.query });
    return next();
  } catch (err) {
    const error = err as ZodError;
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      },
    });
  }
};
