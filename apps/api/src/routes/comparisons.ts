import { Router } from 'express';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { comparisonSchema, comparisonUpdateSchema } from '../lib/schemas.js';
import { requireUser } from '../middleware/auth.js';

export const comparisonsRouter = Router();
comparisonsRouter.use(requireUser);
const includeItems = {
  items: {
    orderBy: { position: 'asc' as const },
    include: { product: { include: { category: true } } },
  },
};

comparisonsRouter.get('/', async (request, response, next) => {
  try {
    const items = await db.savedComparison.findMany({
      where: { userId: request.session.userId! },
      orderBy: { updatedAt: 'desc' },
      include: includeItems,
    });
    response.json({ items });
  } catch (error) {
    next(error);
  }
});

async function validateProducts(productIds: string[]) {
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, categoryId: true },
  });
  if (products.length !== productIds.length)
    return { error: 'One or more products were not found.' };
  if (new Set(products.map((product) => product.categoryId)).size !== 1)
    return { error: 'A comparison can only include products from the same category.' };
  return { products };
}

comparisonsRouter.post('/', async (request, response, next) => {
  const parsed = comparisonSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: {
        message: 'Provide a name and 2–4 unique product ids.',
        details: parsed.error.flatten(),
      },
    });
    return;
  }
  try {
    const check = await validateProducts(parsed.data.productIds);
    if ('error' in check) {
      response.status(400).json({ error: { message: check.error } });
      return;
    }
    const comparison = await db.savedComparison.create({
      data: {
        userId: request.session.userId!,
        name: parsed.data.name,
        items: {
          create: parsed.data.productIds.map((productId, position) => ({ productId, position })),
        },
      },
      include: includeItems,
    });
    response.status(201).json({ item: comparison });
  } catch (error) {
    next(error);
  }
});

comparisonsRouter.get('/:id', async (request, response, next) => {
  const id = z.uuid().safeParse(request.params.id);
  if (!id.success) {
    response.status(400).json({ error: { message: 'Invalid comparison id.' } });
    return;
  }
  try {
    const item = await db.savedComparison.findFirst({
      where: { id: id.data, userId: request.session.userId! },
      include: includeItems,
    });
    if (!item) {
      response.status(404).json({ error: { message: 'Comparison not found.' } });
      return;
    }
    response.json({ item });
  } catch (error) {
    next(error);
  }
});

comparisonsRouter.patch('/:id', async (request, response, next) => {
  const id = z.uuid().safeParse(request.params.id);
  const parsed = comparisonUpdateSchema.safeParse(request.body);
  if (!id.success || !parsed.success) {
    response.status(400).json({
      error: { message: 'Provide a valid comparison id, name, and 2–4 unique product ids.' },
    });
    return;
  }
  try {
    const owned = await db.savedComparison.findFirst({
      where: { id: id.data, userId: request.session.userId! },
      select: { id: true },
    });
    if (!owned) {
      response.status(404).json({ error: { message: 'Comparison not found.' } });
      return;
    }
    const check = await validateProducts(parsed.data.productIds);
    if ('error' in check) {
      response.status(400).json({ error: { message: check.error } });
      return;
    }
    const item = await db.$transaction(async (tx) => {
      await tx.comparisonItem.deleteMany({ where: { comparisonId: owned.id } });
      return tx.savedComparison.update({
        where: { id: owned.id },
        data: {
          name: parsed.data.name,
          items: {
            create: parsed.data.productIds.map((productId, position) => ({ productId, position })),
          },
        },
        include: includeItems,
      });
    });
    response.json({ item });
  } catch (error) {
    next(error);
  }
});

comparisonsRouter.delete('/:id', async (request, response, next) => {
  const id = z.uuid().safeParse(request.params.id);
  if (!id.success) {
    response.status(400).json({ error: { message: 'Invalid comparison id.' } });
    return;
  }
  try {
    const deleted = await db.savedComparison.deleteMany({
      where: { id: id.data, userId: request.session.userId! },
    });
    if (!deleted.count) {
      response.status(404).json({ error: { message: 'Comparison not found.' } });
      return;
    }
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});
