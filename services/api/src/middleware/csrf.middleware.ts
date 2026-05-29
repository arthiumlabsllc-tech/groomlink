import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';

// CSRF protection middleware
export const csrfProtection = csrf({ 
  cookie: { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production', 
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  } 
});

// Expose CSRF token to frontend
// Cast req to any because the @types/csurf augmentation of Express.Request
// is unreliable across different node_modules states (e.g. fresh Docker builder).
export const exposeCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  const r = req as any;
  if (typeof r.csrfToken === 'function') {
    res.setHeader('X-CSRF-Token', r.csrfToken());
  }
  next();
};

// CSRF error handler
export const handleCsrfError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'Invalid CSRF token. Please refresh the page and try again.'
      }
    });
  }
  next(err);
};
