import { HttpError } from '../../shared/errors/http-error.js';
import type { CreateAvailabilityInput, UpdateAvailabilityStatusInput } from './availability.schemas.js';
import { AvailabilityRepository } from './availability.repository.js';

export class AvailabilityService {
  constructor(private readonly repository: AvailabilityRepository) {}

  async create(userId: string, input: CreateAvailabilityInput) {
    const doctorId = await this.repository.findDoctorByUserId(userId);
    if (!doctorId) throw new HttpError(403, 'Doctor access required');

    try {
      return await this.repository.createSlot(doctorId, input.startsAt, input.endsAt);
    } catch (error) {
      if (isUniqueViolation(error)) throw new HttpError(409, 'An identical availability slot already exists');
      if (isExclusionViolation(error)) throw new HttpError(409, 'Availability slot overlaps an existing slot');
      throw error;
    }
  }

  async list(doctorId: string, status: 'available' | 'unavailable' | null) {
    return this.repository.listByDoctorId(doctorId, status);
  }

  async updateStatus(userId: string, slotId: string, input: UpdateAvailabilityStatusInput) {
    const doctorId = await this.repository.findDoctorByUserId(userId);
    if (!doctorId) throw new HttpError(403, 'Doctor access required');

    const existing = await this.repository.findById(slotId);
    if (!existing) throw new HttpError(404, 'Availability slot not found');
    if (existing.doctorId !== doctorId) throw new HttpError(403, 'Forbidden');

    return this.repository.updateStatus(slotId, input.status);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return isPgCode(error, '23505');
}

function isExclusionViolation(error: unknown): boolean {
  return isPgCode(error, '23P01');
}

function isPgCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === code;
}
