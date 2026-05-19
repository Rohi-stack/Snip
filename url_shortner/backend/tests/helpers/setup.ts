import { beforeEach } from 'vitest';
import { resetDb } from './reset-db.js';

beforeEach(async () => {
  await resetDb();
});
