// Vercel routes all /api/* requests through this Express serverless function.
import { app } from '../apps/api/dist/app.js';

export default app;
