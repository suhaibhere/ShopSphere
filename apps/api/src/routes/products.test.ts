import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import session from 'express-session';

const mocks = vi.hoisted(() => ({
  productFindMany: vi.fn(),
  productCount: vi.fn(),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  wishlistFindMany: vi.fn(),
  comparisonFindFirst: vi.fn(),
}));
vi.mock('../lib/db.js', () => ({
  db: {
    product: { findMany: mocks.productFindMany, count: mocks.productCount },
    user: { findUnique: mocks.userFindUnique, create: mocks.userCreate },
    wishlistItem: { findMany: mocks.wishlistFindMany },
    savedComparison: { findFirst: mocks.comparisonFindFirst },
  },
}));
vi.mock('argon2', () => ({ default: { hash: vi.fn(), verify: vi.fn() } }));

import argon2 from 'argon2';
import { createApp } from '../app.js';
const testStore = new session.MemoryStore();
const app = createApp(testStore);
const origin = 'http://localhost:5173';

describe('product catalog API', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns paginated matching products and applies the validated filters', async () => {
    mocks.productFindMany.mockResolvedValue([{ id: 'p1', name: 'Forma One' }]);
    mocks.productCount.mockResolvedValue(1);
    const response = await request(app).get(
      '/api/products?q=Forma&category=smartphones&minPrice=100&sort=price-asc&page=2&pageSize=6',
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      total: 1,
      page: 2,
      pageSize: 6,
      pages: 1,
      items: [{ name: 'Forma One' }],
    });
    expect(mocks.productFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 6, take: 6, orderBy: { price: 'asc' } }),
    );
    expect(mocks.productFindMany.mock.calls[0][0].where).toMatchObject({
      category: { slug: 'smartphones' },
      price: { gte: 100 },
    });
  });

  it('rejects invalid pagination rather than passing it to the database', async () => {
    const response = await request(app).get('/api/products?page=0&pageSize=1000');
    expect(response.status).toBe(400);
    expect(mocks.productFindMany).not.toHaveBeenCalled();
  });

  it('requires a session for wishlist reads', async () => {
    const response = await request(app).get('/api/wishlist');
    expect(response.status).toBe(401);
  });

  it('rejects cookie-authenticated mutations without the trusted browser origin', async () => {
    const response = await request(app).post('/api/auth/logout');
    expect(response.status).toBe(403);
  });

  it('validates registration input before touching the database', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('Origin', origin)
      .send({ email: 'not-an-email', password: 'short' });
    expect(response.status).toBe(400);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it('creates a session, returns only public user fields, scopes private reads, and logs out', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    mocks.userFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: 'user-1', email: 'reader@example.com', createdAt });
    mocks.userCreate.mockResolvedValue({ id: 'user-1', email: 'reader@example.com', createdAt });
    vi.mocked(argon2.hash).mockResolvedValue('argon-hash');
    mocks.wishlistFindMany.mockResolvedValue([]);
    mocks.comparisonFindFirst.mockResolvedValue(null);
    const registered = await request(app)
      .post('/api/auth/register')
      .set('Origin', origin)
      .send({ email: 'Reader@Example.com', password: 'a-long-demo-password' });
    expect(registered.status).toBe(201);
    expect(registered.body.user).toEqual({
      id: 'user-1',
      email: 'reader@example.com',
      createdAt: createdAt.toISOString(),
    });
    expect(registered.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(registered.headers['set-cookie'][0]).toContain('SameSite=Lax');

    const cookie = registered.headers['set-cookie'][0].split(';', 1)[0];
    const current = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(current.body.user.id).toBe('user-1');
    expect((await request(app).get('/api/wishlist').set('Cookie', cookie)).status).toBe(200);
    expect(mocks.wishlistFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
    expect(
      (
        await request(app)
          .get('/api/comparisons/34cc10c8-1b4a-4f96-89bd-6f1866133a83')
          .set('Cookie', cookie)
      ).status,
    ).toBe(404);
    expect(mocks.comparisonFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: '34cc10c8-1b4a-4f96-89bd-6f1866133a83', userId: 'user-1' },
      }),
    );

    expect(
      (await request(app).post('/api/auth/logout').set('Origin', origin).set('Cookie', cookie))
        .status,
    ).toBe(204);
    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).body.user).toBeNull();
  });

  it('serves the API health endpoint', async () => {
    const response = await request(app).get('/api/health');
    expect(response.body).toEqual({ status: 'ok', service: 'shopsphere-api' });
  });
});
