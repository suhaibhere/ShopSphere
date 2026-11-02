// Vercel detects this Express export and serves the API as a serverless function.
// Static Vite assets are copied to /public and delivered through Vercel's CDN.
import { app } from './apps/api/dist/app.js';

export default app;
