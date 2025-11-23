import http from 'http';
import app from './app';
import { env } from './config/env';
import { initPrisma, shutdownPrisma } from './services/prisma';

const server = http.createServer(app);

async function start() {
  try {
    // Try to initialize the database if configured. If not available, continue without DB
    try {
      if (process.env.DATABASE_URL) {
        await initPrisma();
      } else {
        // eslint-disable-next-line no-console
        console.warn('DATABASE_URL not set; starting without database. DB-dependent endpoints may be unavailable.');
      }
    } catch (dbErr) {
      // eslint-disable-next-line no-console
      console.warn('Failed to connect to database. Starting server without DB. Some endpoints will be unavailable.', dbErr);
    }

    server.listen(env.PORT,env.NODE_IP, () => {
      // eslint-disable-next-line no-console
      console.log(`API server listening on http://${env.NODE_IP}:${env.PORT}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await shutdownPrisma();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', async () => {
  await shutdownPrisma();
  server.close(() => process.exit(0));
});

start();

