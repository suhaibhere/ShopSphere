import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ me: vi.fn(), products: vi.fn(), categories: vi.fn() }));
vi.mock('./services/api', () => ({ api: mocks }));

import App from './App';

const sample = {
  id: 'product-1',
  name: 'Forma One',
  slug: 'forma-one',
  description: 'A fictional demo phone.',
  brand: 'Aster',
  price: '649.00',
  currency: 'USD',
  imageUrl: null,
  sourceUrl: null,
  priceCheckedAt: null,
  specifications: { Display: '6.2 in OLED', Storage: '256 GB' },
  category: {
    id: 'category-1',
    name: 'Smartphones',
    slug: 'smartphones',
    description: 'Demo products',
  },
};

describe('discovery journey', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.me.mockResolvedValue({ user: null });
    mocks.products.mockResolvedValue({ items: [sample], total: 1, page: 1, pages: 1 });
    mocks.categories.mockResolvedValue({ items: [{ name: 'Smartphones', slug: 'smartphones' }] });
  });
  afterEach(() => cleanup());

  it('shows real catalog data and opens a product comparison', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('link', { name: 'Forma One' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'Illustrative smartphones artwork for Forma One; not an official product photo',
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add Forma One to comparison' }));
    await user.click(screen.getByRole('link', { name: /Compare/ }));
    expect(await screen.findByText('Forma One')).toBeInTheDocument();
    expect(screen.getByText('Display')).toBeInTheDocument();
  });

  it('adds a product to the cart, shows the count, and totals it on the cart page', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: 'Add Forma One to cart' }));
    await user.click(screen.getByRole('button', { name: 'Add Forma One to cart' }));
    const cartLink = screen.getByRole('link', { name: 'Cart, 2 items' });
    expect(cartLink).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('shopsphere.cart') ?? '{}')).toEqual({
      'forma-one': 2,
    });
    await user.click(cartLink);
    expect(await screen.findByRole('link', { name: 'Forma One' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Quantity of Forma One' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Forma One from cart' }));
    expect(await screen.findByText('Your cart is empty.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cart, 0 items' })).toBeInTheDocument();
  });
});
