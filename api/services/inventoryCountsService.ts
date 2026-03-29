import api from "../api";
import type {
  HospitalityApiResponse,
  PaginatedResponse,
  HospitalityInventoryCount,
  HospitalityInventoryCountItem,
  CreateInventoryCountRequest,
} from "../../types/hospitality";

const BASE = "/hospitality/inventory-counts";

class InventoryCountsService {
  async list(params?: { storeId?: number; status?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) {
    const res = await api.get<PaginatedResponse<HospitalityInventoryCount>>(BASE, { params });
    return res.data;
  }

  async get(id: number) {
    const res = await api.get<HospitalityApiResponse<HospitalityInventoryCount>>(`${BASE}/${id}`);
    return res.data;
  }

  async create(data: CreateInventoryCountRequest) {
    const res = await api.post<HospitalityApiResponse<HospitalityInventoryCount>>(BASE, data);
    return res.data;
  }

  async updateItem(id: number, data: { countedQuantity: number; notes?: string }) {
    const res = await api.put<HospitalityApiResponse<HospitalityInventoryCountItem>>(`${BASE}/items/${id}`, data);
    return res.data;
  }

  async complete(id: number) {
    const res = await api.post(`${BASE}/${id}/complete`);
    return res.data;
  }

  async approve(id: number) {
    const res = await api.post(`${BASE}/${id}/approve`);
    return res.data;
  }
}

export default new InventoryCountsService();
