import { Router } from 'express';
import argon2 from 'argon2';
import { rateLimit } from 'express-rate-limit';
import { Prisma } from '@prisma/client';
import { db } from '../lib/db.js';
import { loginSchema, registerSchema } from '../lib/schemas.js';

export const authRouter = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

authRouter.post('/register', authLimiter, async (request, response, next) => {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: {
        message: 'Enter a valid email and a password of at least 10 characters.',
        details: parsed.error.flatten(),
      },
    });
    return;
  }
  try {
    const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      response
        .status(409)
        .json({ error: { message: 'An account with that email already exists.' } });
      return;
    }
    const passwordHash = await argon2.hash(parsed.data.password, { type: argon2.argon2id });
    const user = await db.user.create({
      data: { email: parsed.data.email, passwordHash },
      select: { id: true, email: true, createdAt: true },
    });
    request.session.regenerate((error) => {
      if (error) {
        next(error);
        return;
      }
      request.session.userId = user.id;
      request.session.save((saveError) =>
        saveError ? next(saveError) : response.status(201).json({ user }),
      );
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      response
        .status(409)
        .json({ error: { message: 'An account with that email already exists.' } });
      return;
    }
    next(error);
  }
});

authRouter.post('/login', authLimiter, async (request, response, next) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { message: 'Enter a valid email and password.' } });
    return;
  }
  try {
    const user = await db.user.findUnique({ where: { email: parsed.data.email } });
    const valid = user && (await argon2.verify(user.passwordHash, parsed.data.password));
    if (!valid || !user) {
      response.status(401).json({ error: { message: 'Email or password is incorrect.' } });
      return;
    }
    request.session.regenerate((error) => {
      if (error) {
        next(error);
        return;
      }
      request.session.userId = user.id;
      request.session.save((saveError) =>
        saveError
          ? next(saveError)
          : response.json({ user: { id: user.id, email: user.email, createdAt: user.createdAt } }),
      );
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', (request, response, next) => {
  request.session.destroy((error) => {
    if (error) {
      next(error);
      return;
    }
    response.clearCookie('shopsphere.sid', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    response.status(204).end();
  });
});

authRouter.get('/me', async (request, response, next) => {
  if (!request.session.userId) {
    response.json({ user: null });
    return;
  }
  try {
    const user = await db.user.findUnique({
      where: { id: request.session.userId },
      select: { id: true, email: true, createdAt: true },
    });
    response.json({ user });
  } catch (error) {
    next(error);
  }
});
