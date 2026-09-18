import 'dotenv/config';

const baseUrl = process.env.OBSERVABILITY_SMOKE_BASE_URL ?? 'http://localhost:3000/api';

async function main() {
  const healthResponse = await fetch(`${baseUrl}/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Health endpoint failed: ${healthResponse.status}`);
  }

  const requestId = `observability-smoke-${Date.now()}`;
  const healthWithContext = await fetch(`${baseUrl}/health`, {
    headers: { 'x-request-id': requestId },
  });

  if (healthWithContext.status !== 200) {
    throw new Error(`Request-context health check failed: ${healthWithContext.status}`);
  }

  if (healthWithContext.headers.get('x-request-id') !== requestId) {
    throw new Error('x-request-id was not propagated');
  }

  const traceparent = healthWithContext.headers.get('traceparent');
  if (!traceparent || !/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/.test(traceparent)) {
    throw new Error('Valid W3C traceparent was not returned');
  }

  const metricsResponse = await fetch(`${baseUrl}/metrics`);
  if (metricsResponse.status !== 200) {
    throw new Error(`Metrics endpoint failed: ${metricsResponse.status}`);
  }

  const metricsText = await metricsResponse.text();
  for (const requiredMetric of ['http_requests_total', 'http_errors_total', 'http_request_duration_ms']) {
    if (!metricsText.includes(requiredMetric)) {
      throw new Error(`Missing metric: ${requiredMetric}`);
    }
  }

  console.log('Phase 11 observability smoke test passed.');
  console.log('Request correlation, W3C trace context, structured request metrics, and metrics endpoint succeeded.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
