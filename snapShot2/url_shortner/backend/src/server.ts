import { createApp } from './app.js';
import { env } from './config/index.js';
import { disconnectPrisma } from './prisma/client.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
  console.log(`Health: http://localhost:${env.port}/api/v1/health`);
});

async function shutdown(): Promise<void> {
  console.log('Shutting down...');
  server.close();
  await disconnectPrisma();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
