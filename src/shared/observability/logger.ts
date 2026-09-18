export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

function serialize(message: string, context?: Record<string, unknown>) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    ...(context ?? {}),
  });
}

export const logger: Logger = {
  info(message, context) {
    console.log(serialize(message, context));
  },
  error(message, context) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      ...(context ?? {}),
    }));
  },
};
