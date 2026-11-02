import './load-env.js';
import { app } from './app.js';

const port = Number(process.env.API_PORT ?? 4000);

if (process.env.NODE_ENV === 'production' && (process.env.SESSION_SECRET?.length ?? 0) < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 characters in production.');
}

app.listen(port, () => {
  console.log(`ShopSphere API listening on http://localhost:${port}`);
});
