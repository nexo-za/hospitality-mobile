import api from '../api';
import type {
  CheckDiscount,
  CheckServiceCharge,
  ReceiptData,
  ApplyDiscountRequest,
  ApplyServiceChargeRequest,
  HospitalityApiResponse,
} from '../../types/hospitality';

const BASE = '/hospitality/checks';

class BillingService {
  private static instance: BillingService;
  private constructor() {}

  static getInstance(): BillingService {
    if (!BillingService.instance) {
      BillingService.instance = new BillingService();
    }
    return BillingService.instance;
  }

  async applyDiscount(
    checkId: number,
    body: ApplyDiscountRequest
  ): Promise<CheckDiscount> {
    const res = await api.post<HospitalityApiResponse<CheckDiscount>>(
      `${BASE}/${checkId}/discounts`,
      body
    );
    return res.data.data;
  }

  async removeDiscount(discountId: number): Promise<void> {
    await api.delete(`${BASE}/discounts/${discountId}`);
  }

  async applyServiceCharge(
    checkId: number,
    body: ApplyServiceChargeRequest
  ): Promise<CheckServiceCharge> {
    const res = await api.post<HospitalityApiResponse<CheckServiceCharge>>(
      `${BASE}/${checkId}/service-charges`,
      body
    );
    return res.data.data;
  }

  async removeServiceCharge(chargeId: number): Promise<void> {
    await api.delete(`${BASE}/service-charges/${chargeId}`);
  }

  async getReceipt(checkId: number): Promise<ReceiptData> {
    const res = await api.get<HospitalityApiResponse<ReceiptData>>(
      `${BASE}/${checkId}/receipt`
    );
    return res.data.data;
  }
}

export default BillingService.getInstance();
