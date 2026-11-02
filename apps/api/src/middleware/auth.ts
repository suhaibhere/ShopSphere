import type { NextFunction, Request, Response } from 'express';

export function requireUser(request: Request, response: Response, next: NextFunction) {
  if (!request.session.userId) {
    response.status(401).json({ error: { message: 'Sign in to continue.' } });
    return;
  }
  next();
}

export function requireSameOrigin(request: Request, response: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    next();
    return;
  }
  const origin = request.get('origin');
  const allowedOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
  if (origin !== allowedOrigin) {
    response.status(403).json({ error: { message: 'Request origin is not allowed.' } });
    return;
  }
  next();
}
