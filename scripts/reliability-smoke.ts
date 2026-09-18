import { withExponentialBackoff } from '../src/shared/reliability/retry.js';

async function main() {
  let attempts = 0;
  const delays: number[] = [];

  const result = await withExponentialBackoff(
    async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('transient');
      return 'ok';
    },
    {
      maxAttempts: 4,
      initialDelayMs: 10,
      maxDelayMs: 25,
      shouldRetry: (error) => error instanceof Error && error.message === 'transient',
      sleep: async (delayMs) => {
        delays.push(delayMs);
      },
    },
  );

  if (result !== 'ok' || attempts !== 3 || delays.length !== 2 || delays[0] !== 10 || delays[1] !== 20) {
    throw new Error(`Retry behavior failed: ${JSON.stringify({ result, attempts, delays })}`);
  }

  let nonRetryableAttempts = 0;
  try {
    await withExponentialBackoff(
      async () => {
        nonRetryableAttempts += 1;
        throw new Error('permanent');
      },
      {
        maxAttempts: 4,
        initialDelayMs: 10,
        maxDelayMs: 25,
        shouldRetry: () => false,
        sleep: async () => undefined,
      },
    );
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'permanent' || nonRetryableAttempts !== 1) {
      throw error;
    }
  }

  console.log('Phase 12 reliability smoke test passed.');
  console.log('Exponential backoff, retry limits, and non-retryable failure handling succeeded.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
