import { createContext, useContext, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  GitCompareArrows,
  Heart,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { api, type Product, type SavedComparison, type User } from './services/api';
import { ProductVisual } from './components/ProductVisual';
import './features.css';

function formatPrice(price: Product['price'], currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(price));
}

const CART_KEY = 'shopsphere.cart';
const MAX_CART_QUANTITY = 10;
type CartContents = Record<string, number>;

function readCart(): CartContents {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CART_KEY) ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const cart: CartContents = {};
    for (const [slug, quantity] of Object.entries(value)) {
      if (typeof quantity === 'number' && Number.isInteger(quantity) && quantity > 0) {
        cart[slug] = Math.min(quantity, MAX_CART_QUANTITY);
      }
    }
    return cart;
  } catch {
    return {};
  }
}

type AppState = {
  user: User | null;
  wishlist: string[];
  compare: Product[];
  cart: CartContents;
  cartCount: number;
  addToCart: (product: Product) => void;
  setCartQuantity: (slug: string, quantity: number) => void;
  removeFromCart: (slug: string) => void;
  clearCart: () => void;
  notice: string;
  setNotice: (message: string) => void;
  toggleWishlist: (product: Product) => Promise<void>;
  addCompare: (product: Product) => boolean;
  removeCompare: (slug: string) => void;
  setCompare: (products: Product[]) => void;
  authenticate: (mode: 'login' | 'register', email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const State = createContext<AppState | null>(null);
function useApp() {
  const value = useContext(State);
  if (!value) throw new Error('App state is unavailable.');
  return value;
}

function readList(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [wishlist, setWishlist] = useState<string[]>(() => readList('shopsphere.wishlist'));
  const [compare, setCompare] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartContents>(readCart);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // Storage can be unavailable (private mode); the cart still works for this visit.
    }
  }, [cart]);

  function addToCart(product: Product) {
    const current = cart[product.slug] ?? 0;
    if (current >= MAX_CART_QUANTITY) {
      setNotice(`You can keep up to ${MAX_CART_QUANTITY} of one product in your cart.`);
      return;
    }
    setCart({ ...cart, [product.slug]: current + 1 });
    setNotice(`${product.name} added to your cart.`);
  }
  function setCartQuantity(slug: string, quantity: number) {
    if (quantity < 1) return removeFromCart(slug);
    setCart((items) => ({ ...items, [slug]: Math.min(quantity, MAX_CART_QUANTITY) }));
  }
  function removeFromCart(slug: string) {
    setCart((items) => {
      const { [slug]: _removed, ...rest } = items;
      return rest;
    });
  }
  const cartCount = Object.values(cart).reduce((total, quantity) => total + quantity, 0);

  useEffect(() => {
    let active = true;
    api
      .me()
      .then(({ user: current }) => {
        if (active) setUser(current);
      })
      .catch(() => {});
    api
      .products('pageSize=48')
      .then(({ items }) => {
        if (active)
          setCompare(items.filter((item) => readList('shopsphere.compare').includes(item.slug)));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(
      'shopsphere.compare',
      JSON.stringify(compare.map((product) => product.slug)),
    );
  }, [compare]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const guestSlugs = readList('shopsphere.wishlist');
        if (guestSlugs.length) {
          const { items } = await api.products('pageSize=48');
          await Promise.all(
            items
              .filter((product) => guestSlugs.includes(product.slug))
              .map((product) => api.addWishlist(product.id)),
          );
          localStorage.removeItem('shopsphere.wishlist');
        }
        const saved = await api.wishlist();
        if (active) setWishlist(saved.items.map(({ product }) => product.slug));
      } catch (error) {
        if (active)
          setNotice(error instanceof Error ? error.message : 'Could not load your saved items.');
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  async function toggleWishlist(product: Product) {
    const exists = wishlist.includes(product.slug);
    try {
      if (user) {
        if (exists) await api.removeWishlist(product.id);
        else await api.addWishlist(product.id);
      }
      const next = exists
        ? wishlist.filter((slug) => slug !== product.slug)
        : [...wishlist, product.slug];
      setWishlist(next);
      if (!user) localStorage.setItem('shopsphere.wishlist', JSON.stringify(next));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not update your saved items.');
    }
  }

  function addCompare(product: Product) {
    if (compare.some((item) => item.slug === product.slug)) {
      setNotice('Already in your comparison.');
      return false;
    }
    if (compare.length >= 4) {
      setNotice('A comparison can include up to four products.');
      return false;
    }
    if (compare.length && compare[0].category.slug !== product.category.slug) {
      setNotice(
        `Compare ${compare[0].category.name.toLowerCase()} with other ${compare[0].category.name.toLowerCase()} only.`,
      );
      return false;
    }
    setCompare([...compare, product]);
    setNotice(`${product.name} added to your comparison.`);
    return true;
  }

  async function authenticate(mode: 'login' | 'register', email: string, password: string) {
    const result =
      mode === 'login' ? await api.login(email, password) : await api.register(email, password);
    setUser(result.user);
  }
  async function logout() {
    await api.logout();
    setUser(null);
    setWishlist(readList('shopsphere.wishlist'));
  }

  const value: AppState = {
    user,
    wishlist,
    compare,
    cart,
    cartCount,
    addToCart,
    setCartQuantity,
    removeFromCart,
    clearCart: () => setCart({}),
    notice,
    setNotice,
    toggleWishlist,
    addCompare,
    removeCompare: (slug) => setCompare((items) => items.filter((item) => item.slug !== slug)),
    setCompare,
    authenticate,
    logout,
  };
  return (
    <State.Provider value={value}>
      <SiteLayout />
    </State.Provider>
  );
}

function SiteLayout() {
  const { user, compare, cartCount, notice, setNotice, logout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div id="top" className="app-shell">
      <header className="site-header wrap">
        <Link to="/" className="brand">
          shop<span>sphere</span>
          <i>®</i>
        </Link>
        <span className="brand-note">THE PRODUCT EDIT</span>
        <button
          className="mobile-menu"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
        >
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
        <nav className={mobileOpen ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">
          <NavLink to="/" onClick={() => setMobileOpen(false)}>
            Discover
          </NavLink>
          <NavLink to="/compare" onClick={() => setMobileOpen(false)}>
            Compare <span className="nav-count">{compare.length}</span>
          </NavLink>
          <NavLink to="/saved" onClick={() => setMobileOpen(false)}>
            Saved
          </NavLink>
        </nav>
        <div className="header-actions">
          <Link aria-label="Wishlist" to="/wishlist">
            <Heart size={17} />
          </Link>
          <Link
            className="cart-link"
            aria-label={`Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
            to="/cart"
          >
            <ShoppingCart size={17} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
          {user ? (
            <button className="sign-in" onClick={() => void logout()}>
              Sign out <ArrowRight size={14} />
            </button>
          ) : (
            <Link className="sign-in" to="/sign-in">
              Sign in <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </header>
      {notice && (
        <div className="notice wrap" role="status">
          {notice}
          <button onClick={() => setNotice('')} aria-label="Dismiss message">
            <X size={14} />
          </button>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Discover />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/comparisons/:id" element={<LoadSavedComparison />} />
        <Route path="/sign-in" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <footer className="footer wrap">
        <Link to="/" className="brand footer-brand">
          shop<span>sphere</span>
          <i>®</i>
        </Link>
        <span>THE PRODUCT EDIT&nbsp; / &nbsp;PRODUCT RESEARCH, MADE CLEAR</span>
        <a href="#top">BACK TO TOP ↑</a>
      </footer>
    </div>
  );
}

function Discover() {
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const [result, setResult] = useState<{ items: Product[]; total: number; pages: number } | null>(
    null,
  );
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [minPrice, setMinPrice] = useState(params.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') ?? '');
  const [brand, setBrand] = useState(params.get('brand') ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const current = new URLSearchParams(query);
    setSearch(current.get('q') ?? '');
    setMinPrice(current.get('minPrice') ?? '');
    setMaxPrice(current.get('maxPrice') ?? '');
    setBrand(current.get('brand') ?? '');
  }, [query]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([api.products(query), api.categories()])
      .then(([products, categoryList]) => {
        if (active) {
          setResult(products);
          setCategories(categoryList.items);
        }
      })
      .catch((issue) => {
        if (active)
          setError(issue instanceof Error ? issue.message : 'The catalog could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, reload]);
  function changeParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set('page', '1');
    setParams(next);
  }
  function submitSearch(event: FormEvent) {
    event.preventDefault();
    changeParam('q', search.trim());
  }
  function submitPrice(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(params);
    if (minPrice) next.set('minPrice', minPrice);
    else next.delete('minPrice');
    if (maxPrice) next.set('maxPrice', maxPrice);
    else next.delete('maxPrice');
    if (brand.trim()) next.set('brand', brand.trim());
    else next.delete('brand');
    next.set('page', '1');
    setParams(next);
  }
  return (
    <main>
      <section className="hero wrap">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-line" /> A clearer way to choose
          </p>
          <h1>
            Good things,
            <br />
            <em>well considered.</em>
          </h1>
          <p className="hero-description">
            The details behind the things you bring into your life. Research, compare, and choose
            with confidence.
          </p>
          <a href="#catalog" className="text-link">
            Explore the collection <ArrowRight size={15} />
          </a>
        </div>
        <div className="hero-art" aria-label="Abstract editorial product illustration">
          <div className="art-index">
            FIELD NOTE&nbsp; 001 <span>OBJECT STUDY</span>
          </div>
          <div className="art-disc">
            <div className="disc-center" />
            <div className="disc-shine" />
          </div>
          <div className="art-shadow" />
          <div className="art-caption">
            <span>FORM / FUNCTION</span>
            <span>01 — 04</span>
          </div>
          <span className="art-side">SOUND, IN ITS OWN SPACE</span>
        </div>
        <div className="hero-foot">
          <span>INDEPENDENT PRODUCT RESEARCH</span>
          <span>VOL. 01&nbsp; / &nbsp;2026</span>
        </div>
      </section>
      <section className="catalog wrap" id="catalog">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE COLLECTION&nbsp; / &nbsp;01</p>
            <h2>Find your point of view.</h2>
          </div>
          <span className="result-note">
            {result ? `${result.total} considered objects` : 'The collection'}
          </span>
        </div>
        <form className="search-form" role="search" onSubmit={submitSearch}>
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, brand, or category"
            aria-label="Search products"
          />
          <button type="submit">
            Search <ArrowRight size={14} />
          </button>
        </form>
        <div className="catalog-tools">
          <div className="category-tabs" role="group" aria-label="Product category">
            <button
              className={!params.get('category') ? 'category-tab active' : 'category-tab'}
              onClick={() => changeParam('category', '')}
            >
              All objects
            </button>
            {categories.map((category) => (
              <button
                key={category.slug}
                className={
                  params.get('category') === category.slug ? 'category-tab active' : 'category-tab'
                }
                onClick={() => changeParam('category', category.slug)}
              >
                {category.name}
              </button>
            ))}
          </div>
          <div className="tool-actions">
            <button
              className="tool-button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal size={15} /> Filter
            </button>
            <label className="sort-select">
              Sort{' '}
              <select
                aria-label="Sort products"
                value={params.get('sort') ?? 'name'}
                onChange={(event) => changeParam('sort', event.target.value)}
              >
                <option value="name">Name</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
              <ArrowDown size={13} />
            </label>
          </div>
        </div>
        {filtersOpen && (
          <form className="filter-panel" onSubmit={submitPrice}>
            <label>
              Brand
              <input
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                placeholder="Any brand"
              />
            </label>
            <label>
              Minimum price
              <input
                inputMode="decimal"
                type="number"
                min="0"
                step="0.01"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
              />
            </label>
            <label>
              Maximum price
              <input
                inputMode="decimal"
                type="number"
                min="0"
                step="0.01"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
              />
            </label>
            <button className="small-action" type="submit">
              Apply filters
            </button>
            <button
              className="text-action"
              type="button"
              onClick={() => {
                setMinPrice('');
                setMaxPrice('');
                setBrand('');
                const next = new URLSearchParams(params);
                next.delete('brand');
                next.delete('minPrice');
                next.delete('maxPrice');
                setParams(next);
              }}
            >
              Clear
            </button>
          </form>
        )}
        {error && (
          <div className="state-message error-state">
            <strong>The collection is out of reach.</strong>
            <span>{error} Check the API and database setup, then try again.</span>
            <button className="small-action" onClick={() => setReload((count) => count + 1)}>
              Try again
            </button>
          </div>
        )}
        {loading && (
          <div className="loading-state" aria-live="polite">
            Gathering the details…
          </div>
        )}
        {!loading && !error && result?.items.length === 0 && (
          <div className="state-message">
            <strong>Nothing in this edition matches yet.</strong>
            <span>Try another search or clear a filter to see more objects.</span>
            <button className="text-action" onClick={() => setParams(new URLSearchParams())}>
              Clear all filters
            </button>
          </div>
        )}
        {!loading && !error && result && result.items.length > 0 && (
          <>
            <div className="product-grid">
              {result.items.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
            {result.pages > 1 && (
              <div className="pagination">
                <button
                  disabled={(Number(params.get('page')) || 1) <= 1}
                  onClick={() => changeParam('page', String((Number(params.get('page')) || 1) - 1))}
                >
                  ← Previous
                </button>
                <span>
                  PAGE {params.get('page') ?? 1} / {result.pages}
                </span>
                <button
                  disabled={(Number(params.get('page')) || 1) >= result.pages}
                  onClick={() => changeParam('page', String((Number(params.get('page')) || 1) + 1))}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
        <div className="first-look">
          <div className="first-look-mark">
            A NOTE
            <br />
            ON CHOOSING
          </div>
          <div>
            <span className="eyebrow">START WITH WHAT MATTERS</span>
            <h3>
              The best choice is
              <br />
              the one that fits <em>you.</em>
            </h3>
          </div>
          <p>
            Compare the details that make a difference in your day — without the noise of a sales
            pitch.
          </p>
          <Link className="circle-link" to="/compare" aria-label="Open comparison workspace">
            <ArrowRight size={19} />
          </Link>
        </div>
      </section>
      <section className="manifesto">
        <div className="wrap manifesto-inner">
          <span className="eyebrow">OUR APPROACH</span>
          <p>
            Less noise. <em>More knowing.</em>
          </p>
          <span className="manifesto-end">A better decision starts with a better question.</span>
        </div>
      </section>
    </main>
  );
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  const { wishlist, toggleWishlist, compare, addCompare, cart, addToCart } = useApp();
  const saved = wishlist.includes(product.slug);
  const inCart = cart[product.slug] ?? 0;
  const selected = compare.some((item) => item.id === product.id);
  return (
    <article className="product-card">
      <div className={`product-art product-art-${index % 4}`}>
        <span className="product-category">{product.category.name}</span>
        <button
          className={saved ? 'save-button saved' : 'save-button'}
          onClick={() => void toggleWishlist(product)}
          aria-label={
            saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`
          }
        >
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
        <ProductVisual product={product} />
        <span className="demo-flag">ILLUSTRATIVE PRODUCT ART</span>
      </div>
      <div className="product-meta">
        <span>{product.brand}</span>
        <span>{formatPrice(product.price, product.currency)}</span>
      </div>
      <h3>
        <Link to={`/products/${product.slug}`}>{product.name}</Link>
      </h3>
      <div className="product-card-foot">
        <Link to={`/products/${product.slug}`} className="detail-link">
          View product <ArrowRight size={13} />
        </Link>
        <button
          className={selected ? 'compare-add selected' : 'compare-add'}
          onClick={() => addCompare(product)}
          aria-label={
            selected ? `${product.name} is in comparison` : `Add ${product.name} to comparison`
          }
        >
          {selected ? <Check size={14} /> : <GitCompareArrows size={14} />}{' '}
          {selected ? 'Added' : 'Compare'}
        </button>
      </div>
      <button
        className={inCart ? 'cart-add in-cart' : 'cart-add'}
        onClick={() => addToCart(product)}
        aria-label={`Add ${product.name} to cart`}
      >
        <ShoppingCart size={14} /> {inCart ? `In cart (${inCart}) · add another` : 'Add to cart'}
      </button>
    </article>
  );
}

function ProductDetail() {
  const { slug = '' } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const { wishlist, toggleWishlist, addCompare, cart, addToCart } = useApp();
  useEffect(() => {
    let active = true;
    api
      .product(slug)
      .then(({ item }) => {
        if (active) setProduct(item);
      })
      .catch((issue) => {
        if (active) setError(issue instanceof Error ? issue.message : 'Product not found.');
      });
    return () => {
      active = false;
    };
  }, [slug]);
  if (error)
    return (
      <main className="wrap page-content">
        <div className="state-message">
          <strong>We couldn’t find that object.</strong>
          <span>{error}</span>
          <Link className="text-link" to="/">
            Return to discovery <ArrowRight size={14} />
          </Link>
        </div>
      </main>
    );
  if (!product)
    return <main className="wrap page-content loading-state">Opening the product notes…</main>;
  return (
    <main className="wrap page-content">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} /> Back to discovery
      </Link>
      <div className="detail-layout">
        <div className="detail-art">
          <span className="eyebrow">
            PRODUCT NOTE&nbsp; / &nbsp;{product.category.name.toUpperCase()}
          </span>
          <ProductVisual product={product} />
          <span className="demo-flag">ILLUSTRATIVE PRODUCT ART</span>
        </div>
        <div className="detail-copy">
          <p className="eyebrow">
            {product.brand}&nbsp; / &nbsp;{product.category.name}
          </p>
          <h1>{product.name}</h1>
          <p className="detail-price">{formatPrice(product.price, product.currency)}</p>
          <p>{product.description}</p>
          {product.sourceUrl && (
            <a
              className="text-link source-link"
              href={product.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Check the official product page <ArrowRight size={13} />
            </a>
          )}
          <div className="detail-actions">
            <button className="primary-action" onClick={() => addToCart(product)}>
              <ShoppingCart size={15} />{' '}
              {cart[product.slug] ? `In cart (${cart[product.slug]}) · add another` : 'Add to cart'}
            </button>
            <button className="secondary-action" onClick={() => addCompare(product)}>
              <GitCompareArrows size={15} /> Add to comparison
            </button>
            <button className="secondary-action" onClick={() => void toggleWishlist(product)}>
              <Heart size={15} fill={wishlist.includes(product.slug) ? 'currentColor' : 'none'} />{' '}
              {wishlist.includes(product.slug) ? 'Saved' : 'Save for later'}
            </button>
          </div>
          <h2>Specifications</h2>
          <dl className="spec-list">
            {Object.entries(product.specifications).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="demo-disclaimer">
            Reference price checked{' '}
            {product.priceCheckedAt
              ? new Date(product.priceCheckedAt).toLocaleDateString('en-IN')
              : 'date unavailable'}
            . Prices, offers and availability can change. Product artwork is illustrative, not an
            official product photo.
          </p>
        </div>
      </div>
    </main>
  );
}

function ComparePage() {
  const { compare, removeCompare, user, setNotice } = useApp();
  const [params] = useSearchParams();
  const [name, setName] = useState('My product shortlist');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const editId = params.get('edit');
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      setNotice('Sign in to save a comparison.');
      return;
    }
    if (compare.length < 2) return;
    setSaving(true);
    setMessage('');
    try {
      if (editId)
        await api.updateComparison(
          editId,
          name,
          compare.map((item) => item.id),
        );
      else
        await api.saveComparison(
          name,
          compare.map((item) => item.id),
        );
      setMessage(editId ? 'Comparison updated.' : 'Comparison saved.');
    } catch (issue) {
      setMessage(issue instanceof Error ? issue.message : 'Could not save the comparison.');
    } finally {
      setSaving(false);
    }
  }
  const specs = [...new Set(compare.flatMap((product) => Object.keys(product.specifications)))];
  return (
    <main className="wrap page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE WORKSPACE&nbsp; / &nbsp;02</p>
          <h1>
            See the details <em>side by side.</em>
          </h1>
        </div>
        <span className="result-note">{compare.length} / 4 objects</span>
      </div>
      <p className="page-intro">
        A useful comparison starts with products made for the same kind of day.
      </p>
      {compare.length === 0 ? (
        <div className="state-message">
          <strong>Your comparison starts here.</strong>
          <span>
            Choose two to four products from the same category to see their specifications together.
          </span>
          <Link className="text-link" to="/">
            Browse the collection <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          <div className="comparison-scroll">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th scope="col">DETAIL</th>
                  {compare.map((product) => (
                    <th key={product.id} scope="col">
                      <button
                        className="remove-compare"
                        onClick={() => removeCompare(product.slug)}
                        aria-label={`Remove ${product.name}`}
                      >
                        <X size={14} />
                      </button>
                      <div className="comparison-object">
                        <ProductVisual product={product} />
                      </div>
                      <span className="eyebrow">{product.brand}</span>
                      <Link to={`/products/${product.slug}`}>{product.name}</Link>
                      <strong>{formatPrice(product.price, product.currency)}</strong>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {specs.map((spec) => {
                  const values = compare.map((product) => product.specifications[spec] ?? '—');
                  const different = new Set(values).size > 1;
                  return (
                    <tr key={spec} className={different ? 'different-row' : ''}>
                      <th scope="row">{spec}</th>
                      {values.map((value, index) => (
                        <td key={`${spec}-${index}`}>{value}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="difference-note">
            Rows with an orange rule differ across your selection. A difference is a detail to
            consider, not a universal winner.
          </p>
          <form className="save-comparison" onSubmit={(event) => void save(event)}>
            <label>
              Save this comparison
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
              />
            </label>
            <button className="primary-action" disabled={saving || compare.length < 2}>
              {saving ? 'Saving…' : editId ? 'Update saved list' : 'Save comparison'}
            </button>
            {!user && <Link to="/sign-in">Sign in to keep it</Link>}
            {message && <span role="status">{message}</span>}
          </form>
        </>
      )}
      {compare.length < 4 && (
        <div className="add-more">
          <Link to="/">+ Add another product</Link>
        </div>
      )}
    </main>
  );
}

function WishlistPage() {
  const { wishlist } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api
      .products('pageSize=48')
      .then(({ items }) => {
        if (active) setProducts(items.filter((product) => wishlist.includes(product.slug)));
      })
      .catch((issue) => {
        if (active) setError(issue instanceof Error ? issue.message : 'Could not load wishlist.');
      });
    return () => {
      active = false;
    };
  }, [wishlist]);
  return (
    <main className="wrap page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR EDIT&nbsp; / &nbsp;01</p>
          <h1>
            Worth <em>another look.</em>
          </h1>
        </div>
      </div>
      <p className="page-intro">A quiet place for the things you’re still thinking about.</p>
      {error && <p className="inline-error">{error}</p>}
      {!error && !products.length ? (
        <div className="state-message">
          <strong>Your saved shelf is empty.</strong>
          <span>Save an object while you browse and it will find its way here.</span>
          <Link to="/" className="text-link">
            Browse the collection <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      )}
    </main>
  );
}

function CartPage() {
  const { cart, setCartQuantity, removeFromCart, clearCart } = useApp();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState('');
  const slugs = Object.keys(cart).sort().join('|');
  useEffect(() => {
    if (!slugs) {
      setProducts([]);
      return;
    }
    let active = true;
    api
      .products('pageSize=48')
      .then(({ items }) => {
        if (!active) return;
        const wanted = slugs.split('|');
        const found = items.filter((product) => wanted.includes(product.slug));
        setProducts(found);
        // Drop products that no longer exist in the catalog so the cart count stays honest.
        for (const slug of wanted) {
          if (!found.some((product) => product.slug === slug)) removeFromCart(slug);
        }
      })
      .catch((issue) => {
        if (active) setError(issue instanceof Error ? issue.message : 'Could not load your cart.');
      });
    return () => {
      active = false;
    };
    // removeFromCart only updates state through a functional setter, so it is safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugs]);

  const lines = (products ?? []).filter((product) => cart[product.slug]);
  const subtotal = lines.reduce(
    (total, product) => total + Number(product.price) * (cart[product.slug] ?? 0),
    0,
  );
  const currency = lines[0]?.currency ?? 'INR';
  return (
    <main className="wrap page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR EDIT&nbsp; / &nbsp;CART</p>
          <h1>
            Your <em>cart.</em>
          </h1>
        </div>
      </div>
      <p className="page-intro">
        A shortlist of what you plan to buy. ShopSphere doesn’t sell products or take payments, so
        use each official link to check the current price and complete your purchase.
      </p>
      {error && <p className="inline-error">{error}</p>}
      {products === null && !error && <p className="loading-state">Loading your cart…</p>}
      {products !== null && !error && !lines.length && (
        <div className="state-message">
          <strong>Your cart is empty.</strong>
          <span>Add a product while you browse and it will appear here.</span>
          <Link to="/" className="text-link">
            Browse the collection <ArrowRight size={14} />
          </Link>
        </div>
      )}
      {lines.length > 0 && (
        <div className="cart-layout">
          <ul className="cart-list">
            {lines.map((product) => {
              const quantity = cart[product.slug] ?? 1;
              return (
                <li key={product.id} className="cart-line">
                  <div className="cart-line-info">
                    <span className="cart-line-brand">{product.brand}</span>
                    <Link to={`/products/${product.slug}`} className="cart-line-name">
                      {product.name}
                    </Link>
                    <span className="cart-line-unit">
                      {formatPrice(product.price, product.currency)} each
                    </span>
                    {product.sourceUrl && (
                      <a
                        className="text-link source-link"
                        href={product.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Official page <ArrowRight size={12} />
                      </a>
                    )}
                  </div>
                  <div className="cart-qty" role="group" aria-label={`Quantity of ${product.name}`}>
                    <button
                      onClick={() => setCartQuantity(product.slug, quantity - 1)}
                      aria-label={`Decrease quantity of ${product.name}`}
                    >
                      <Minus size={13} />
                    </button>
                    <span aria-live="polite">{quantity}</span>
                    <button
                      onClick={() => setCartQuantity(product.slug, quantity + 1)}
                      disabled={quantity >= MAX_CART_QUANTITY}
                      aria-label={`Increase quantity of ${product.name}`}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <strong className="cart-line-total">
                    {formatPrice(Number(product.price) * quantity, product.currency)}
                  </strong>
                  <button
                    className="cart-remove"
                    onClick={() => removeFromCart(product.slug)}
                    aria-label={`Remove ${product.name} from cart`}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
          <aside className="cart-summary" aria-label="Cart summary">
            <span className="eyebrow">REFERENCE TOTAL</span>
            <strong className="cart-subtotal">{formatPrice(subtotal, currency)}</strong>
            <p className="demo-disclaimer">
              Based on reference prices, not live offers. Confirm price and availability at the
              official source before buying.
            </p>
            <button className="secondary-action" onClick={clearCart}>
              Clear cart
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}

function SavedPage() {
  const { user } = useApp();
  const [items, setItems] = useState<SavedComparison[]>([]);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .comparisons()
      .then(({ items: saved }) => {
        if (active) setItems(saved);
      })
      .catch((issue) => {
        if (active)
          setError(issue instanceof Error ? issue.message : 'Could not load saved comparisons.');
      });
    return () => {
      active = false;
    };
  }, [user, version]);
  async function rename(item: SavedComparison) {
    const name = window.prompt('Name this comparison', item.name);
    if (!name?.trim()) return;
    try {
      await api.updateComparison(
        item.id,
        name.trim(),
        item.items.map(({ product }) => product.id),
      );
      setVersion(version + 1);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not rename the comparison.');
    }
  }
  async function remove(item: SavedComparison) {
    try {
      await api.deleteComparison(item.id);
      setVersion(version + 1);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not delete the comparison.');
    }
  }
  return (
    <main className="wrap page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR LIBRARY&nbsp; / &nbsp;02</p>
          <h1>
            Decisions, <em>in progress.</em>
          </h1>
        </div>
      </div>
      <p className="page-intro">Your saved product comparisons, ready when you are.</p>
      {!user ? (
        <div className="state-message">
          <strong>Your private library is waiting.</strong>
          <span>Sign in to save and return to comparisons across sessions.</span>
          <Link className="primary-action" to="/sign-in">
            Sign in <ArrowRight size={14} />
          </Link>
        </div>
      ) : error ? (
        <div className="state-message error-state">{error}</div>
      ) : !items.length ? (
        <div className="state-message">
          <strong>No saved comparisons yet.</strong>
          <span>Build a side-by-side shortlist and save it here.</span>
          <Link className="text-link" to="/">
            Explore products <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="saved-list">
          {items.map((item) => (
            <article className="saved-row" key={item.id}>
              <div>
                <p className="eyebrow">
                  {item.items[0]?.product.category.name ?? 'PRODUCTS'}&nbsp; / &nbsp;
                  {item.items.length} OBJECTS
                </p>
                <h2>{item.name}</h2>
                <p>{item.items.map(({ product }) => product.name).join(' · ')}</p>
              </div>
              <div className="saved-actions">
                <Link to={`/comparisons/${item.id}`} className="text-link">
                  Open <ArrowRight size={14} />
                </Link>
                <button onClick={() => rename(item)} aria-label={`Rename ${item.name}`}>
                  Rename
                </button>
                <button onClick={() => void remove(item)} aria-label={`Delete ${item.name}`}>
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

function LoadSavedComparison() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { setCompare } = useApp();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api
      .comparison(id)
      .then(({ item }) => {
        if (active) {
          setCompare(item.items.map(({ product }) => product));
          navigate(`/compare?edit=${item.id}`, { replace: true });
        }
      })
      .catch((issue) => {
        if (active)
          setError(issue instanceof Error ? issue.message : 'Could not open this comparison.');
      });
    return () => {
      active = false;
    };
  }, [id, navigate, setCompare]);
  return (
    <main className="wrap page-content">
      {error ? (
        <div className="state-message error-state">
          <strong>This comparison isn’t available.</strong>
          <span>{error}</span>
          <Link to="/saved">Back to your library</Link>
        </div>
      ) : (
        <div className="loading-state">Opening your saved comparison…</div>
      )}
    </main>
  );
}

function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { authenticate, user } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user)
    return (
      <main className="wrap page-content">
        <div className="state-message">
          <strong>You’re signed in.</strong>
          <Link to="/saved" className="text-link">
            Open your library <ArrowRight size={14} />
          </Link>
        </div>
      </main>
    );
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await authenticate(mode, email, password);
      navigate('/saved');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="wrap page-content auth-page">
      <p className="eyebrow">A PERSONAL PRODUCT EDIT</p>
      <h1>
        {mode === 'login' ? (
          <>
            Welcome <em>back.</em>
          </>
        ) : (
          <>
            Make room for <em>better choices.</em>
          </>
        )}
      </h1>
      <p className="page-intro">Your saved items stay yours and follow you between visits.</p>
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={320}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'register' ? 10 : 1}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <small>
            {mode === 'register'
              ? 'Use at least 10 characters.'
              : 'Your password is sent securely to the ShopSphere API.'}
          </small>
        </label>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-action" disabled={busy}>
          {busy ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}{' '}
          <ArrowRight size={15} />
        </button>
      </form>
      <p className="auth-switch">
        {mode === 'login' ? 'New to ShopSphere?' : 'Already have an account?'}{' '}
        <Link to={mode === 'login' ? '/register' : '/sign-in'}>
          {mode === 'login' ? 'Create an account' : 'Sign in'}
        </Link>
      </p>
    </main>
  );
}

function NotFound() {
  return (
    <main className="wrap page-content">
      <div className="state-message">
        <strong>This page hasn’t made the collection.</strong>
        <Link to="/" className="text-link">
          Back to discovery <ArrowRight size={14} />
        </Link>
      </div>
    </main>
  );
}

export default App;
