export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  productCount?: number;
};
export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  price: string | number;
  currency: string;
  imageUrl: string | null;
  specifications: Record<string, string>;
  category: Category;
};
export type User = { id: string; email: string; createdAt: string };
export type SavedComparison = {
  id: string;
  name: string;
  items: { position: number; product: Product }[];
  updatedAt: string;
};

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? 'The request could not be completed.');
  return body as T;
}

export const api = {
  products: (query = '') =>
    request<{ items: Product[]; total: number; page: number; pages: number }>(
      `/products${query ? `?${query}` : ''}`,
    ),
  product: (slug: string) => request<{ item: Product }>(`/products/${encodeURIComponent(slug)}`),
  categories: () => request<{ items: Category[] }>('/categories'),
  me: () => request<{ user: User | null }>('/auth/me'),
  login: (email: string, password: string) =>
    request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string) =>
    request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  wishlist: () => request<{ items: { product: Product }[] }>('/wishlist'),
  addWishlist: (productId: string) =>
    request<{ saved: boolean }>('/wishlist', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    }),
  removeWishlist: (productId: string) =>
    request<void>(`/wishlist/${productId}`, { method: 'DELETE' }),
  comparisons: () => request<{ items: SavedComparison[] }>('/comparisons'),
  saveComparison: (name: string, productIds: string[]) =>
    request<{ item: SavedComparison }>('/comparisons', {
      method: 'POST',
      body: JSON.stringify({ name, productIds }),
    }),
  comparison: (id: string) => request<{ item: SavedComparison }>(`/comparisons/${id}`),
  updateComparison: (id: string, name: string, productIds: string[]) =>
    request<{ item: SavedComparison }>(`/comparisons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, productIds }),
    }),
  deleteComparison: (id: string) => request<void>(`/comparisons/${id}`, { method: 'DELETE' }),
};
