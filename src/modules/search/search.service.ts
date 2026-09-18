import type { SearchDoctorsInput } from './search.schemas.js';
import { SearchRepository } from './search.repository.js';

export class SearchService {
  constructor(private readonly repository: SearchRepository) {}

  async searchDoctors(input: SearchDoctorsInput) {
    return this.repository.searchDoctors(input);
  }
}
