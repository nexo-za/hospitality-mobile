import api from '../api';
import type {
  GuestProfile,
  CreateGuestRequest,
  GuestHistoryEntry,
  HospitalityApiResponse,
  PaginatedResponse,
} from '../../types/hospitality';

const BASE = '/hospitality/guests';

class GuestsService {
  private static instance: GuestsService;
  private constructor() {}

  static getInstance(): GuestsService {
    if (!GuestsService.instance) {
      GuestsService.instance = new GuestsService();
    }
    return GuestsService.instance;
  }

  async list(params?: {
    page?: number;
    limit?: number;
    isVIP?: boolean;
    search?: string;
  }): Promise<PaginatedResponse<GuestProfile>> {
    const res = await api.get<PaginatedResponse<GuestProfile>>(BASE, {
      params,
    });
    return res.data;
  }

  async create(body: CreateGuestRequest): Promise<GuestProfile> {
    const res = await api.post<HospitalityApiResponse<GuestProfile>>(
      BASE,
      body
    );
    return res.data.data;
  }

  async get(id: number): Promise<GuestProfile> {
    const res = await api.get<HospitalityApiResponse<GuestProfile>>(
      `${BASE}/${id}`
    );
    return res.data.data;
  }

  async getHistory(id: number): Promise<GuestHistoryEntry[]> {
    const res = await api.get<HospitalityApiResponse<GuestHistoryEntry[]>>(
      `${BASE}/${id}/history`
    );
    return res.data.data;
  }

  async update(id: number, data: Partial<CreateGuestRequest>): Promise<GuestProfile> {
    const res = await api.put<HospitalityApiResponse<GuestProfile>>(`${BASE}/${id}`, data);
    return res.data.data;
  }

  async remove(id: number) {
    return (await api.delete(`${BASE}/${id}`)).data;
  }

  async getPreferences(id: number) {
    const res = await api.get(`${BASE}/${id}/preferences`);
    return res.data;
  }

}

export default GuestsService.getInstance();
