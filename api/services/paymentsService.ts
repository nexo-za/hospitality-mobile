import api from '../api';
import type {
  HospitalityPayment,
  ProcessPaymentRequest,
  RefundPaymentRequest,
  PaymentSummary,
  TipsSummary,
  HospitalityApiResponse,
} from '../../types/hospitality';

const BASE = '/hospitality/payments';

class PaymentsService {
  private static instance: PaymentsService;
  private constructor() {}

  static getInstance(): PaymentsService {
    if (!PaymentsService.instance) {
      PaymentsService.instance = new PaymentsService();
    }
    return PaymentsService.instance;
  }

  async processPayment(
    body: ProcessPaymentRequest
  ): Promise<HospitalityPayment> {
    const res = await api.post<HospitalityApiResponse<HospitalityPayment>>(
      BASE,
      body
    );
    return res.data.data;
  }

  async getPaymentsForCheck(checkId: number): Promise<HospitalityPayment[]> {
    const res = await api.get<HospitalityApiResponse<HospitalityPayment[]>>(
      `${BASE}/check/${checkId}`
    );
    return res.data.data;
  }

  async voidPayment(id: number): Promise<HospitalityPayment> {
    const res = await api.post<HospitalityApiResponse<HospitalityPayment>>(
      `${BASE}/${id}/void`
    );
    return res.data.data;
  }

  async refundPayment(
    id: number,
    body?: RefundPaymentRequest
  ): Promise<HospitalityPayment> {
    const res = await api.post<HospitalityApiResponse<HospitalityPayment>>(
      `${BASE}/${id}/refund`,
      body
    );
    return res.data.data;
  }

  async getPaymentSummary(params?: {
    storeId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PaymentSummary> {
    const res = await api.get<HospitalityApiResponse<PaymentSummary>>(
      `${BASE}/summary`,
      { params }
    );
    return res.data.data;
  }

  async getTipsSummary(params?: {
    storeId?: number;
    dateFrom?: string;
    dateTo?: string;
    serverId?: number;
  }): Promise<TipsSummary> {
    const res = await api.get<HospitalityApiResponse<TipsSummary>>(
      `${BASE}/tips`,
      { params }
    );
    return res.data.data;
  }
}

export default PaymentsService.getInstance();
