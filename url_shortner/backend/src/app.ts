import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFoundHandler } from './middleware/not-found.middleware.js';
import { apiRouter } from './routes/index.js';
import { redirectRouter } from './routes/redirect.routes.js';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    error: { code: 'TOO_MANY_REQUESTS' }
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 15, // Limit each IP to 15 authentication attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    error: { code: 'AUTH_RATE_LIMIT_EXCEEDED' }
  }
});

export function createApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: '10kb' })); // Mitigate body buffer attacks

  // Apply rate limiters
  if (process.env.NODE_ENV !== 'test') {
    app.use('/api/v1/auth', authLimiter);
    app.use('/api', apiLimiter);
  }

  app.get('/', (_req, res) => {
    res.json({ name: 'url-shortener-api', version: '1.0.0' });
  });

  app.use('/api', apiRouter);
  app.use('/', redirectRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
