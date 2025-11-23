import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema<any>) => (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = {
      body: req.body,
      query: req.query,
      params: req.params
    };
    schema.parse(data);
    next();
  } catch (err) {
    next(err);
  }
};

