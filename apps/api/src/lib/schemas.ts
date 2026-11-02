import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .email()
    .max(320)
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(10).max(128),
});
export const loginSchema = z.object({
  email: z
    .email()
    .max(320)
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(128),
});
export const wishlistSchema = z.object({ productId: z.uuid() });
export const comparisonSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    productIds: z.array(z.uuid()).min(2).max(4),
  })
  .refine(
    (value) => new Set(value.productIds).size === value.productIds.length,
    'Duplicate products are not allowed.',
  );
export const comparisonUpdateSchema = comparisonSchema;
