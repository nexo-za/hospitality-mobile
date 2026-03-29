import api from '../api';
import type {
  Reservation,
  CreateReservationRequest,
  SeatReservationRequest,
  CancelReservationRequest,
  ReservationAvailability,
  WaitlistEntry,
  AddWaitlistEntryRequest,
  EstimatedWait,
  HospitalityApiResponse,
  PaginatedResponse,
} from '../../types/hospitality';

const RES_BASE = '/hospitality/reservations';
const WL_BASE = '/hospitality/waitlist';

class ReservationsService {
  private static instance: ReservationsService;
  private constructor() {}

  static getInstance(): ReservationsService {
    if (!ReservationsService.instance) {
      ReservationsService.instance = new ReservationsService();
    }
    return ReservationsService.instance;
  }

  // ---- Reservations ----

  async list(params?: {
    page?: number;
    limit?: number;
    storeId?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    guestName?: string;
    guestPhone?: string;
  }): Promise<PaginatedResponse<Reservation>> {
    const res = await api.get<PaginatedResponse<Reservation>>(RES_BASE, {
      params,
    });
    return res.data;
  }

  async getToday(storeId?: number): Promise<Reservation[]> {
    const res = await api.get<HospitalityApiResponse<Reservation[]>>(
      `${RES_BASE}/today`,
      { params: storeId ? { storeId } : undefined }
    );
    return res.data.data;
  }

  async getUpcoming(params?: {
    storeId?: number;
    limit?: number;
  }): Promise<Reservation[]> {
    const res = await api.get<HospitalityApiResponse<Reservation[]>>(
      `${RES_BASE}/upcoming`,
      { params }
    );
    return res.data.data;
  }

  async checkAvailability(params: {
    storeId: number;
    date: string;
    partySize: number;
  }): Promise<ReservationAvailability> {
    const res = await api.get<HospitalityApiResponse<ReservationAvailability>>(
      `${RES_BASE}/availability`,
      { params }
    );
    return res.data.data;
  }

  async create(body: CreateReservationRequest): Promise<Reservation> {
    const res = await api.post<HospitalityApiResponse<Reservation>>(
      RES_BASE,
      body
    );
    return res.data.data;
  }

  async confirm(id: number): Promise<Reservation> {
    const res = await api.post<HospitalityApiResponse<Reservation>>(
      `${RES_BASE}/${id}/confirm`
    );
    return res.data.data;
  }

  async seat(id: number, body?: SeatReservationRequest): Promise<Reservation> {
    const res = await api.post<HospitalityApiResponse<Reservation>>(
      `${RES_BASE}/${id}/seat`,
      body
    );
    return res.data.data;
  }

  async complete(id: number): Promise<Reservation> {
    const res = await api.post<HospitalityApiResponse<Reservation>>(
      `${RES_BASE}/${id}/complete`
    );
    return res.data.data;
  }

  async cancel(
    id: number,
    body?: CancelReservationRequest
  ): Promise<Reservation> {
    const res = await api.post<HospitalityApiResponse<Reservation>>(
      `${RES_BASE}/${id}/cancel`,
      body
    );
    return res.data.data;
  }

  async noShow(id: number): Promise<Reservation> {
    const res = await api.post<HospitalityApiResponse<Reservation>>(
      `${RES_BASE}/${id}/no-show`
    );
    return res.data.data;
  }

  // ---- Waitlist ----

  async listWaitlist(params?: {
    storeId?: number;
    status?: string;
  }): Promise<WaitlistEntry[]> {
    const res = await api.get<HospitalityApiResponse<WaitlistEntry[]>>(
      WL_BASE,
      { params }
    );
    return res.data.data;
  }

  async getEstimatedWait(params: {
    storeId: number;
    partySize: number;
  }): Promise<EstimatedWait> {
    const res = await api.get<HospitalityApiResponse<EstimatedWait>>(
      `${WL_BASE}/estimated-wait`,
      { params }
    );
    return res.data.data;
  }

  async addToWaitlist(body: AddWaitlistEntryRequest): Promise<WaitlistEntry> {
    const res = await api.post<HospitalityApiResponse<WaitlistEntry>>(
      WL_BASE,
      body
    );
    return res.data.data;
  }

  // ---- Reservation update ----

  async update(id: number, data: Partial<CreateReservationRequest>): Promise<Reservation> {
    const res = await api.put<HospitalityApiResponse<Reservation>>(`${RES_BASE}/${id}`, data);
    return res.data.data;
  }

  // ---- Additional waitlist methods ----

  async updateWaitlistEntry(id: number, data: Partial<AddWaitlistEntryRequest>): Promise<WaitlistEntry> {
    const res = await api.put<HospitalityApiResponse<WaitlistEntry>>(`${WL_BASE}/${id}`, data);
    return res.data.data;
  }

  async removeWaitlistEntry(id: number) {
    return (await api.delete(`${WL_BASE}/${id}`)).data;
  }

  async notifyWaitlistEntry(id: number) {
    const res = await api.post<HospitalityApiResponse<WaitlistEntry>>(`${WL_BASE}/${id}/notify`);
    return res.data.data;
  }

  async seatWaitlistEntry(id: number, tableId?: number): Promise<WaitlistEntry> {
    const res = await api.post<HospitalityApiResponse<WaitlistEntry>>(`${WL_BASE}/${id}/seat`, tableId ? { tableId } : undefined);
    return res.data.data;
  }
}

export default ReservationsService.getInstance();
