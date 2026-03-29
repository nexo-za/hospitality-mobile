import api from '../api';
import type {
  DailyReport,
  RevenueReport,
  ServerPerformance,
  WaiterPerformance,
  DashboardSummary,
  LiveOperations,
  HospitalityApiResponse,
  PaginatedResponse,
} from '../../types/hospitality';

const REPORTS_BASE = '/hospitality/reports';
const DASHBOARD_BASE = '/hospitality/dashboard';

class ReportsService {
  private static instance: ReportsService;
  private constructor() {}

  static getInstance(): ReportsService {
    if (!ReportsService.instance) {
      ReportsService.instance = new ReportsService();
    }
    return ReportsService.instance;
  }

  // ---- Reports ----

  async getDailyReports(params?: {
    storeId?: number;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<DailyReport>> {
    const res = await api.get<PaginatedResponse<DailyReport>>(
      `${REPORTS_BASE}/daily`,
      { params }
    );
    return res.data;
  }

  async getRevenueReport(params?: {
    storeId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<RevenueReport> {
    const res = await api.get<HospitalityApiResponse<RevenueReport>>(
      `${REPORTS_BASE}/revenue`,
      { params }
    );
    return res.data.data;
  }

  async getServerPerformance(params?: {
    storeId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ServerPerformance[]> {
    const res = await api.get<HospitalityApiResponse<ServerPerformance[]>>(
      `${REPORTS_BASE}/server-performance`,
      { params }
    );
    return res.data.data;
  }

  async getWaiterPerformance(params?: {
    storeId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<WaiterPerformance> {
    const res = await api.get<HospitalityApiResponse<WaiterPerformance>>(
      `${REPORTS_BASE}/waiter-performance`,
      { params }
    );
    return res.data.data;
  }

  async getWaiterCurrentShift(storeId?: number): Promise<WaiterPerformance> {
    const res = await api.get<HospitalityApiResponse<WaiterPerformance>>(
      `${REPORTS_BASE}/waiter-performance/current-shift`,
      { params: storeId ? { storeId } : undefined }
    );
    return res.data.data;
  }

  // ---- Dashboard ----

  async getDashboardSummary(params?: {
    storeId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<DashboardSummary> {
    const res = await api.get<HospitalityApiResponse<DashboardSummary>>(
      `${DASHBOARD_BASE}/summary`,
      { params }
    );
    return res.data.data;
  }

  async getLiveOperations(storeId?: number): Promise<LiveOperations> {
    const res = await api.get<HospitalityApiResponse<LiveOperations>>(
      `${DASHBOARD_BASE}/live-operations`,
      { params: storeId ? { storeId } : undefined }
    );
    return res.data.data;
  }

  // ---- Additional reports ----

  async getTableTurns(params?: { storeId?: number; dateFrom?: string; dateTo?: string }) {
    return (await api.get(`${REPORTS_BASE}/table-turns`, { params })).data;
  }

  async getVoidsComps(params?: { storeId?: number; dateFrom?: string; dateTo?: string }) {
    return (await api.get(`${REPORTS_BASE}/voids-comps`, { params })).data;
  }

  async getHourlySales(params?: { storeId?: number; date?: string }) {
    return (await api.get(`${REPORTS_BASE}/hourly-sales`, { params })).data;
  }

}

export default ReportsService.getInstance();
