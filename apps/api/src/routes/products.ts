import { Router } from 'express';
import { z } from 'zod';
import { db } from '../lib/db.js';

export const productsRouter = Router();
const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['name', 'price-asc', 'price-desc']).default('name'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

productsRouter.get('/', async (request, response, next) => {
  const parsed = querySchema.safeParse(request.query);
  if (!parsed.success) {
    response
      .status(400)
      .json({ error: { message: 'Invalid product query.', details: parsed.error.flatten() } });
    return;
  }
  try {
    const { q, category, brand, minPrice, maxPrice, sort, page, pageSize } = parsed.data;
    const where = {
      ...(category ? { category: { slug: category } } : {}),
      ...(brand ? { brand: { equals: brand, mode: 'insensitive' as const } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { brand: { contains: q, mode: 'insensitive' as const } },
              { category: { name: { contains: q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined ? { gte: minPrice } : {}),
              ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
          }
        : {}),
    };
    const orderBy =
      sort === 'price-asc'
        ? { price: 'asc' as const }
        : sort === 'price-desc'
          ? { price: 'desc' as const }
          : { name: 'asc' as const };
    const [items, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: true },
      }),
      db.product.count({ where }),
    ]);
    response.json({ items, total, page, pageSize, pages: Math.ceil(total / pageSize) });
  } catch (error) {
    next(error);
  }
});

productsRouter.get('/:slug', async (request, response, next) => {
  try {
    const product = await db.product.findUnique({
      where: { slug: request.params.slug },
      include: { category: true },
    });
    if (!product) {
      response.status(404).json({ error: { message: 'Product not found.' } });
      return;
    }
    response.json({ item: product });
  } catch (error) {
    next(error);
  }
});
