export interface HttpMetricSnapshot {
  requests: number;
  errors: number;
  durationMs: { count: number; sum: number; buckets: Record<string, number> };
  statusCodes: Record<string, number>;
}

const buckets = [5, 10, 25, 50, 100, 200, 500, 1000, 2500, 5000, Infinity];

class MetricsRegistry {
  private requests = 0;
  private errors = 0;
  private durationCount = 0;
  private durationSum = 0;
  private statusCodes: Record<string, number> = {};
  private durationBuckets: Record<string, number> = Object.fromEntries(
    buckets.map((bucket) => [String(bucket), 0]),
  );

  recordHttp(statusCode: number, durationMs: number): void {
    this.requests += 1;
    if (statusCode >= 500) this.errors += 1;
    const status = String(statusCode);
    this.statusCodes[status] = (this.statusCodes[status] ?? 0) + 1;
    this.durationCount += 1;
    this.durationSum += durationMs;

    for (const bucket of buckets) {
      if (durationMs <= bucket) this.durationBuckets[String(bucket)] += 1;
    }
  }

  snapshot(): HttpMetricSnapshot {
    return {
      requests: this.requests,
      errors: this.errors,
      durationMs: {
        count: this.durationCount,
        sum: this.durationSum,
        buckets: { ...this.durationBuckets },
      },
      statusCodes: { ...this.statusCodes },
    };
  }

  prometheus(): string {
    const lines = [
      '# HELP http_requests_total Total number of completed HTTP requests.',
      '# TYPE http_requests_total counter',
      `http_requests_total ${this.requests}`,
      '# HELP http_errors_total Total number of completed HTTP requests with 5xx status.',
      '# TYPE http_errors_total counter',
      `http_errors_total ${this.errors}`,
      '# HELP http_request_duration_ms HTTP request duration in milliseconds.',
      '# TYPE http_request_duration_ms histogram',
    ];

    for (const bucket of buckets) {
      lines.push(`http_request_duration_ms_bucket{le="${bucket === Infinity ? '+Inf' : bucket}"} ${this.durationBuckets[String(bucket)]}`);
    }
    lines.push(`http_request_duration_ms_sum ${this.durationSum}`);
    lines.push(`http_request_duration_ms_count ${this.durationCount}`);

    lines.push('# HELP http_responses_total HTTP responses by status code.');
    lines.push('# TYPE http_responses_total counter');
    for (const [status, count] of Object.entries(this.statusCodes).sort()) {
      lines.push(`http_responses_total{status_code="${status}"} ${count}`);
    }

    return `${lines.join('\n')}\n`;
  }
}

export const metrics = new MetricsRegistry();
