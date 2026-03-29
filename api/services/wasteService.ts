import api from "../api";
import type {
  HospitalityApiResponse,
  PaginatedResponse,
  WasteLog,
  WasteSummary,
  CreateWasteLogRequest,
} from "../../types/hospitality";

const BASE = "/hospitality/waste";

class WasteService {
  async list(params?: { storeId?: number; productId?: number; wasteType?: string; shiftId?: number; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) {
    const res = await api.get<PaginatedResponse<WasteLog>>(BASE, { params });
    return res.data;
  }

  async getSummary(params?: { storeId?: number; dateFrom?: string; dateTo?: string }) {
    const res = await api.get<HospitalityApiResponse<WasteSummary>>(`${BASE}/summary`, { params });
    return res.data;
  }

  async get(id: number) {
    const res = await api.get<HospitalityApiResponse<WasteLog>>(`${BASE}/${id}`);
    return res.data;
  }

  async create(data: CreateWasteLogRequest) {
    const res = await api.post<HospitalityApiResponse<WasteLog>>(BASE, data);
    return res.data;
  }
}

export default new WasteService();
