import api from '../api';
import type {
  KDSStation,
  KDSTicket,
  HospitalityApiResponse,
  PaginatedResponse,
} from '../../types/hospitality';

const BASE = '/hospitality/kds';

class KDSService {
  private static instance: KDSService;
  private constructor() {}

  static getInstance(): KDSService {
    if (!KDSService.instance) {
      KDSService.instance = new KDSService();
    }
    return KDSService.instance;
  }

  async listStations(params?: {
    page?: number;
    limit?: number;
    storeId?: number;
    isActive?: boolean;
  }): Promise<PaginatedResponse<KDSStation>> {
    const res = await api.get<PaginatedResponse<KDSStation>>(
      `${BASE}/stations`,
      { params }
    );
    return res.data;
  }

  async listTickets(
    stationId: number,
    params?: {
      page?: number;
      limit?: number;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      since?: string;
    }
  ): Promise<PaginatedResponse<KDSTicket>> {
    const res = await api.get<PaginatedResponse<KDSTicket>>(
      `${BASE}/stations/${stationId}/tickets`,
      { params }
    );
    return res.data;
  }

  async bumpTicket(id: number): Promise<KDSTicket> {
    const res = await api.post<HospitalityApiResponse<KDSTicket>>(
      `${BASE}/tickets/${id}/bump`
    );
    return res.data.data;
  }

  async startTicket(id: number): Promise<KDSTicket> {
    const res = await api.post<HospitalityApiResponse<KDSTicket>>(`${BASE}/tickets/${id}/start`);
    return res.data.data;
  }

  async readyTicket(id: number): Promise<KDSTicket> {
    const res = await api.post<HospitalityApiResponse<KDSTicket>>(`${BASE}/tickets/${id}/ready`);
    return res.data.data;
  }

  async recallTicket(id: number): Promise<KDSTicket> {
    const res = await api.post<HospitalityApiResponse<KDSTicket>>(`${BASE}/tickets/${id}/recall`);
    return res.data.data;
  }

  async setPriority(id: number, priority: number): Promise<KDSTicket> {
    const res = await api.post<HospitalityApiResponse<KDSTicket>>(`${BASE}/tickets/${id}/priority`, { priority });
    return res.data.data;
  }

  async bumpAll(stationId: number) {
    const res = await api.post(`${BASE}/stations/${stationId}/bump-all`);
    return res.data;
  }

  async updateItemStatus(itemId: number, status: string) {
    const res = await api.patch(`${BASE}/ticket-items/${itemId}/status`, { status });
    return res.data;
  }

  async getMetrics(params?: { storeId?: number; stationId?: number; dateFrom?: string; dateTo?: string }) {
    const res = await api.get(`${BASE}/metrics`, { params });
    return res.data;
  }

  async getHistory(params?: { stationId?: number; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) {
    const res = await api.get(`${BASE}/tickets/history`, { params });
    return res.data;
  }

}

export default KDSService.getInstance();
