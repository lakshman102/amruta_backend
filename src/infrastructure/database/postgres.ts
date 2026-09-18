import { Pool } from 'pg';
import { config } from '../../config/config.js';
import { logger } from '../../shared/observability/logger.js';

export function createDatabasePool(): Pool {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: config.dbPoolMax,
    idleTimeoutMillis: config.dbIdleTimeoutMs,
    connectionTimeoutMillis: config.dbConnectionTimeoutMs,
    statement_timeout: config.dbStatementTimeoutMs,
    application_name: 'amrutam-telemedicine-backend',
  });

  pool.on('error', (error) => {
    logger.error('Unexpected PostgreSQL pool error', {
      errorType: error.name,
      errorMessage: error.message,
    });
  });

  return pool;
}
