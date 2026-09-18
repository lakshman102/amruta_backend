import { AnalyticsRepository, type AnalyticsResult } from './analytics.repository.js';
import type { AnalyticsInput } from './analytics.schemas.js';

export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  getAnalytics(input: AnalyticsInput): Promise<AnalyticsResult> {
    return this.repository.getAnalytics(input);
  }
}
