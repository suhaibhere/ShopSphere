import './load-env.js';
import { app } from './app.js';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);

if (process.env.NODE_ENV === 'production' && (process.env.SESSION_SECRET?.length ?? 0) < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 characters in production.');
}

if (process.env.NODE_ENV === 'production') {
  const webDist = resolve(dirname(fileURLToPath(import.meta.url)), '../../web/dist');
  app.use(express.static(webDist));
  app.use((request, response, next) => {
    if (request.method === 'GET' && !request.path.startsWith('/api')) {
      response.sendFile(resolve(webDist, 'index.html'), (error) => error && next(error));
      return;
    }
    next();
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`ShopSphere listening on port ${port}`);
});
