import api from '../api';
import type {
  CashDrawer,
  CreateDrawerRequest,
  UpdateDrawerRequest,
  CashEvent,
  RecordCashEventRequest,
  ShiftCashSummary,
  BlindCashUp,
  HospitalityApiResponse,
  PaginatedResponse,
} from '../../types/hospitality';

const BASE = '/hospitality/cash';

class CashTillService {
  private static instance: CashTillService;
  private constructor() {}

  static getInstance(): CashTillService {
    if (!CashTillService.instance) {
      CashTillService.instance = new CashTillService();
    }
    return CashTillService.instance;
  }

  // ---- Drawers ----

  async getDrawers(storeId?: number): Promise<CashDrawer[]> {
    const res = await api.get<HospitalityApiResponse<CashDrawer[]>>(
      `${BASE}/drawers`,
      { params: storeId ? { storeId } : undefined }
    );
    return res.data.data;
  }

  async createDrawer(body: CreateDrawerRequest): Promise<CashDrawer> {
    const res = await api.post<HospitalityApiResponse<CashDrawer>>(
      `${BASE}/drawers`,
      body
    );
    return res.data.data;
  }

  async updateDrawer(
    id: number,
    body: UpdateDrawerRequest
  ): Promise<CashDrawer> {
    const res = await api.put<HospitalityApiResponse<CashDrawer>>(
      `${BASE}/drawers/${id}`,
      body
    );
    return res.data.data;
  }

  async deleteDrawer(id: number): Promise<void> {
    await api.delete(`${BASE}/drawers/${id}`);
  }

  // ---- Cash Events ----

  async listEvents(params?: {
    page?: number;
    limit?: number;
    storeId?: number;
    shiftId?: number;
    drawerId?: number;
    eventType?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PaginatedResponse<CashEvent>> {
    const res = await api.get<PaginatedResponse<CashEvent>>(
      `${BASE}/events`,
      { params }
    );
    return res.data;
  }

  async recordEvent(body: RecordCashEventRequest): Promise<CashEvent> {
    const res = await api.post<HospitalityApiResponse<CashEvent>>(
      `${BASE}/events`,
      body
    );
    return res.data.data;
  }

  // ---- Summaries ----

  async getShiftCashSummary(shiftId: number): Promise<ShiftCashSummary> {
    const res = await api.get<HospitalityApiResponse<ShiftCashSummary>>(
      `${BASE}/shift-summary/${shiftId}`
    );
    return res.data.data;
  }

  async getBlindCashUp(
    shiftId: number,
    drawerId: number
  ): Promise<BlindCashUp> {
    const res = await api.get<HospitalityApiResponse<BlindCashUp>>(
      `${BASE}/blind-cash-up/${shiftId}/${drawerId}`
    );
    return res.data.data;
  }
}

export default CashTillService.getInstance();
