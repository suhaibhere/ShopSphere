import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import { authRouter } from './routes/auth.js';
import { categoriesRouter } from './routes/categories.js';
import { comparisonsRouter } from './routes/comparisons.js';
import { productsRouter } from './routes/products.js';
import { wishlistRouter } from './routes/wishlist.js';
import { requireSameOrigin } from './middleware/auth.js';

const PgSessionStore = connectPgSimple(session);
const production = process.env.NODE_ENV === 'production';
const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

export function createApp(
  store: session.Store = new PgSessionStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
  }),
) {
  const app = express();
  app.disable('x-powered-by');
  if (production) app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: webOrigin, credentials: true }));
  app.use(express.json({ limit: '32kb' }));
  app.use(
    session({
      name: 'shopsphere.sid',
      store,
      secret: process.env.SESSION_SECRET ?? 'development-only-change-this-secret-please',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: production,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );
  app.use('/api', requireSameOrigin);
  app.get('/api/health', (_request, response) =>
    response.json({ status: 'ok', service: 'shopsphere-api' }),
  );
  app.use('/api/products', productsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/wishlist', wishlistRouter);
  app.use('/api/comparisons', comparisonsRouter);
  app.use('/api', (_request, response) =>
    response.status(404).json({ error: { message: 'Route not found.' } }),
  );
  const errors: ErrorRequestHandler = (error, _request, response, _next) => {
    void _next;
    console.error('API request failed', error instanceof Error ? error.name : 'UnknownError');
    response.status(500).json({ error: { message: 'Something went wrong. Please try again.' } });
  };
  app.use(errors);
  return app;
}

export const app = createApp();
