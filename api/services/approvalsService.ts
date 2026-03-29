import api from '../api';
import type {
  ApprovalRequest,
  CreateApprovalRequest,
  RejectApprovalRequest,
  HospitalityApiResponse,
} from '../../types/hospitality';

const BASE = '/hospitality/approvals';

class ApprovalsService {
  private static instance: ApprovalsService;
  private constructor() {}

  static getInstance(): ApprovalsService {
    if (!ApprovalsService.instance) {
      ApprovalsService.instance = new ApprovalsService();
    }
    return ApprovalsService.instance;
  }

  async create(body: CreateApprovalRequest): Promise<ApprovalRequest> {
    const res = await api.post<HospitalityApiResponse<ApprovalRequest>>(
      BASE,
      body
    );
    return res.data.data;
  }

  async listPending(storeId?: number): Promise<ApprovalRequest[]> {
    const res = await api.get<HospitalityApiResponse<ApprovalRequest[]>>(BASE, {
      params: storeId ? { storeId } : undefined,
    });
    return res.data.data;
  }

  async get(id: number): Promise<ApprovalRequest> {
    const res = await api.get<HospitalityApiResponse<ApprovalRequest>>(
      `${BASE}/${id}`
    );
    return res.data.data;
  }

  async approve(id: number): Promise<void> {
    await api.post(`${BASE}/${id}/approve`);
  }

  async reject(id: number, body: RejectApprovalRequest): Promise<void> {
    await api.post(`${BASE}/${id}/reject`, body);
  }
}

export default ApprovalsService.getInstance();
