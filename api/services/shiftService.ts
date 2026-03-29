import api from '../api';
import { HOSPITALITY_ENDPOINTS } from '../endpoints.hospitality';
import type {
  HospitalityShift,
  ActiveShiftResponse,
  ActiveShiftSummary,
  OpenShiftRequest,
  CloseShiftCompleteRequest,
  CloseShiftCompleteResponse,
  UnifiedShiftRequest,
  UnifiedShift,
  UnifiedShiftAnalytics,
  UnifiedShiftAuditEntry,
  UnifiedShiftVariance,
  HospitalityApiResponse,
  PaginatedResponse,
} from '../../types/hospitality';

const { SHIFTS, UNIFIED_SHIFTS } = HOSPITALITY_ENDPOINTS;

class ShiftService {
  private static instance: ShiftService;
  private constructor() {}

  static getInstance(): ShiftService {
    if (!ShiftService.instance) {
      ShiftService.instance = new ShiftService();
    }
    return ShiftService.instance;
  }

  // ---- Standard Shifts ----

  async getActiveShift(): Promise<ActiveShiftResponse> {
    const res = await api.get<HospitalityApiResponse<ActiveShiftResponse>>(
      SHIFTS.ACTIVE
    );
    return res.data.data;
  }

  async getActiveShiftSummary(): Promise<ActiveShiftSummary> {
    const res = await api.get<HospitalityApiResponse<ActiveShiftSummary>>(
      SHIFTS.ACTIVE_SUMMARY
    );
    return res.data.data;
  }

  async getUserShifts(userId: number): Promise<HospitalityShift[]> {
    const res = await api.get<HospitalityApiResponse<HospitalityShift[]>>(
      SHIFTS.USER(userId)
    );
    return res.data.data;
  }

  async getShiftsByStore(storeId: number): Promise<HospitalityShift[]> {
    const res = await api.get<HospitalityApiResponse<HospitalityShift[]>>(
      SHIFTS.STORE(storeId)
    );
    return res.data.data;
  }

  async getShiftSales(shiftId: number): Promise<unknown> {
    const res = await api.get<HospitalityApiResponse<unknown>>(
      SHIFTS.SALES(shiftId)
    );
    return res.data.data;
  }

  async getShift(id: number): Promise<HospitalityShift> {
    const res = await api.get<HospitalityApiResponse<HospitalityShift>>(
      SHIFTS.GET(id)
    );
    return res.data.data;
  }

  async openShift(body: OpenShiftRequest): Promise<HospitalityShift> {
    const res = await api.post<
      HospitalityApiResponse<{ shift: HospitalityShift }>
    >(SHIFTS.OPEN, body);
    return res.data.data.shift;
  }

  async closeShift(id: number): Promise<HospitalityShift> {
    const res = await api.put<HospitalityApiResponse<HospitalityShift>>(
      SHIFTS.CLOSE(id)
    );
    return res.data.data;
  }

  async closeShiftComplete(
    body: CloseShiftCompleteRequest
  ): Promise<CloseShiftCompleteResponse> {
    const res = await api.post<
      HospitalityApiResponse<CloseShiftCompleteResponse>
    >(SHIFTS.CLOSE_COMPLETE, body);
    return res.data.data;
  }

  // ---- Unified Shifts ----

  async executeUnifiedShiftOp(
    body: UnifiedShiftRequest
  ): Promise<UnifiedShift> {
    const res = await api.post<HospitalityApiResponse<UnifiedShift>>(
      UNIFIED_SHIFTS.BASE,
      body
    );
    return res.data.data;
  }

  async listUnifiedShifts(params?: {
    page?: number;
    limit?: number;
    storeId?: number;
    status?: string;
  }): Promise<PaginatedResponse<UnifiedShift>> {
    const res = await api.get<PaginatedResponse<UnifiedShift>>(
      UNIFIED_SHIFTS.BASE,
      { params }
    );
    return res.data;
  }

  async getUnifiedShift(id: number): Promise<UnifiedShift> {
    const res = await api.get<HospitalityApiResponse<UnifiedShift>>(
      UNIFIED_SHIFTS.GET(id)
    );
    return res.data.data;
  }

  async getUnifiedShiftAnalytics(
    id: number
  ): Promise<UnifiedShiftAnalytics> {
    const res = await api.get<HospitalityApiResponse<UnifiedShiftAnalytics>>(
      UNIFIED_SHIFTS.ANALYTICS(id)
    );
    return res.data.data;
  }

  async getUnifiedShiftAuditTrail(
    id: number
  ): Promise<UnifiedShiftAuditEntry[]> {
    const res = await api.get<
      HospitalityApiResponse<UnifiedShiftAuditEntry[]>
    >(UNIFIED_SHIFTS.AUDIT(id));
    return res.data.data;
  }

  async getUnifiedShiftVariances(
    id: number
  ): Promise<UnifiedShiftVariance[]> {
    const res = await api.get<HospitalityApiResponse<UnifiedShiftVariance[]>>(
      UNIFIED_SHIFTS.VARIANCES(id)
    );
    return res.data.data;
  }
}

export default ShiftService.getInstance();
