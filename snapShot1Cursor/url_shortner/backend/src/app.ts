import cors from 'cors';
import express from 'express';
import { env } from './config/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';
import { apiRouter } from './routes/index.js';

export function createApp(): express.Application {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.json({ name: 'url-shortener-api', version: '1.0.0' });
  });

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
