import { Router } from 'express';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { requireUser } from '../middleware/auth.js';

export const wishlistRouter = Router();
wishlistRouter.use(requireUser);

wishlistRouter.get('/', async (request, response, next) => {
  try {
    const items = await db.wishlistItem.findMany({
      where: { userId: request.session.userId! },
      orderBy: { createdAt: 'desc' },
      include: { product: { include: { category: true } } },
    });
    response.json({ items });
  } catch (error) {
    next(error);
  }
});

wishlistRouter.post('/', async (request, response, next) => {
  const parsed = z.object({ productId: z.uuid() }).safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: { message: 'A valid productId is required.' } });
    return;
  }
  try {
    const product = await db.product.findUnique({
      where: { id: parsed.data.productId },
      select: { id: true },
    });
    if (!product) {
      response.status(404).json({ error: { message: 'Product not found.' } });
      return;
    }
    await db.wishlistItem.createMany({
      data: { userId: request.session.userId!, productId: product.id },
      skipDuplicates: true,
    });
    response.status(201).json({ saved: true });
  } catch (error) {
    next(error);
  }
});

wishlistRouter.delete('/:productId', async (request, response, next) => {
  const parsed = z.uuid().safeParse(request.params.productId);
  if (!parsed.success) {
    response.status(400).json({ error: { message: 'Invalid product id.' } });
    return;
  }
  try {
    await db.wishlistItem.deleteMany({
      where: { userId: request.session.userId!, productId: parsed.data },
    });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});
