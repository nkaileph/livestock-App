import http from 'http';
import app from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';

const server = http.createServer(app);

const start = async () => {
  try {
    await connectDatabase();
    server.listen(env.PORT, () => logger.info(`Server running on port ${env.PORT}`));
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
};

start();

const shutdown = () => {
  logger.info('Shutting down server...');
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
