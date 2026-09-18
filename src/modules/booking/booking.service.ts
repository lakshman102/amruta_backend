import { HttpError } from '../../shared/errors/http-error.js';
import { BookingRepository, RepositoryError } from './booking.repository.js';
import type { CreateBookingInput } from './booking.schemas.js';

export class BookingService {
  constructor(private readonly repository: BookingRepository) {}

  async create(patientUserId: string, input: CreateBookingInput) {
    try {
      return await this.repository.createBooking(patientUserId, input.availabilitySlotId, input.idempotencyKey);
    } catch (error) {
      if (error instanceof RepositoryError) {
        if (error.reason === 'SLOT_NOT_FOUND') throw new HttpError(404, 'Availability slot not found');
        if (error.reason === 'SLOT_BOOKED') throw new HttpError(409, 'Availability slot is already booked');
        if (error.reason === 'SLOT_UNAVAILABLE') throw new HttpError(409, 'Availability slot is unavailable');
      }
      throw error;
    }
  }

  async get(consultationId: string, userId: string, role: string) {
    const consultation = await this.repository.findForUser(consultationId, userId, role);
    if (!consultation) throw new HttpError(404, 'Consultation not found');
    return consultation;
  }
}
