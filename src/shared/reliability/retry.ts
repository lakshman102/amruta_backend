export type RetryOptions = {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  shouldRetry?: (error: unknown) => boolean;
  sleep?: (delayMs: number) => Promise<void>;
};

const defaultSleep = (delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs));

export async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  if (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1) {
    throw new Error('maxAttempts must be a positive integer');
  }

  const sleep = options.sleep ?? defaultSleep;
  const shouldRetry = options.shouldRetry ?? (() => true);
  let delayMs = Math.max(0, options.initialDelayMs);
  const maxDelayMs = Math.max(delayMs, options.maxDelayMs);

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === options.maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      await sleep(delayMs);
      delayMs = Math.min(maxDelayMs, Math.max(1, delayMs * 2));
    }
  }

  throw new Error('Retry operation exhausted without a result');
}
