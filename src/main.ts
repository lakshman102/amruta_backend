import { createApp } from './app.js';
import { config } from './config/config.js';
import { createDatabasePool } from './infrastructure/database/postgres.js';
import { logger } from './shared/observability/logger.js';
import { withExponentialBackoff } from './shared/reliability/retry.js';

async function bootstrap() {
  const db = createDatabasePool();
  await withExponentialBackoff(
    async () => {
      await db.query('SELECT 1');
    },
    {
      maxAttempts: 3,
      initialDelayMs: 250,
      maxDelayMs: 1_000,
      shouldRetry: () => true,
    },
  );

  const app = createApp(db);
  const server = app.listen(config.port, () => {
    logger.info('Application started', { port: config.port, environment: config.nodeEnv });
  });

  const shutdown = async (signal: string) => {
    logger.info('Shutdown requested', { signal });
    server.close(async () => {
      await db.end();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  logger.error('Application failed to start', { error: String(error) });
  process.exit(1);
});
