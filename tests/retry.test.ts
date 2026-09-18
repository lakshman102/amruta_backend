import test from 'node:test';
import assert from 'node:assert/strict';
import { withExponentialBackoff } from '../src/shared/reliability/retry.js';

test('retries transient failures with exponential backoff and succeeds', async () => {
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
      maxDelayMs: 100,
      sleep: async (delayMs) => { delays.push(delayMs); },
    },
  );

  assert.equal(result, 'ok');
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [10, 20]);
});

test('does not retry a non-retryable failure', async () => {
  let attempts = 0;
  const error = new Error('permanent');

  await assert.rejects(
    withExponentialBackoff(
      async () => {
        attempts += 1;
        throw error;
      },
      {
        maxAttempts: 5,
        initialDelayMs: 10,
        maxDelayMs: 100,
        shouldRetry: () => false,
        sleep: async () => {},
      },
    ),
    error,
  );

  assert.equal(attempts, 1);
});

test('never exceeds the configured attempt limit', async () => {
  let attempts = 0;

  await assert.rejects(
    withExponentialBackoff(
      async () => {
        attempts += 1;
        throw new Error('transient');
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1,
        maxDelayMs: 2,
        sleep: async () => {},
      },
    ),
    /transient/,
  );

  assert.equal(attempts, 3);
});
