import { Router } from 'express';
import { db } from '../lib/db.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (_request, response, next) => {
  try {
    const categories = await db.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    response.json({
      items: categories.map(({ _count, ...category }) => ({
        ...category,
        productCount: _count.products,
      })),
    });
  } catch (error) {
    next(error);
  }
});
