import api from '../api';
import type {
  DailyReport,
  RevenueReport,
  ServerPerformance,
  WaiterPerformance,
  DashboardSummary,
  LiveOperations,
  RevenueTrends,
  TopItem,
  RecentCheck,
  DashboardAnalytics,
  StaffPerformanceEntry,
  InventoryAlerts,
  HospitalityApiResponse,
  PaginatedResponse,
} from '../../types/hospitality';

const REPORTS_BASE = '/hospitality/reports';
const DASHBOARD_BASE = '/hospitality/dashboard';

interface DashboardDateFilters {
  storeId?: number;
  dateFrom?: string;
  dateTo?: string;
}

interface TrendFilters extends DashboardDateFilters {
  interval?: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

interface LimitFilters extends DashboardDateFilters {
  limit?: number;
}

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

  async getRevenueReport(params?: DashboardDateFilters): Promise<RevenueReport> {
    const res = await api.get<HospitalityApiResponse<RevenueReport>>(
      `${REPORTS_BASE}/revenue`,
      { params }
    );
    return res.data.data;
  }

  async getServerPerformance(params?: DashboardDateFilters): Promise<ServerPerformance[]> {
    const res = await api.get<HospitalityApiResponse<ServerPerformance[]>>(
      `${REPORTS_BASE}/server-performance`,
      { params }
    );
    return res.data.data;
  }

  async getWaiterPerformance(params?: DashboardDateFilters): Promise<WaiterPerformance> {
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

  async getDashboardSummary(params?: DashboardDateFilters): Promise<DashboardSummary> {
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

  async getRevenueTrends(params?: TrendFilters): Promise<RevenueTrends> {
    const res = await api.get<HospitalityApiResponse<RevenueTrends>>(
      `${DASHBOARD_BASE}/revenue-trends`,
      { params }
    );
    return res.data.data;
  }

  async getTopItems(params?: LimitFilters): Promise<TopItem[]> {
    const res = await api.get<HospitalityApiResponse<TopItem[]>>(
      `${DASHBOARD_BASE}/top-items`,
      { params }
    );
    return res.data.data;
  }

  async getRecentChecks(params?: LimitFilters): Promise<RecentCheck[]> {
    const res = await api.get<HospitalityApiResponse<RecentCheck[]>>(
      `${DASHBOARD_BASE}/recent-checks`,
      { params }
    );
    return res.data.data;
  }

  async getAnalytics(params?: DashboardDateFilters): Promise<DashboardAnalytics> {
    const res = await api.get<HospitalityApiResponse<DashboardAnalytics>>(
      `${DASHBOARD_BASE}/analytics`,
      { params }
    );
    return res.data.data;
  }

  async getStaffPerformance(params?: LimitFilters): Promise<StaffPerformanceEntry[]> {
    const res = await api.get<HospitalityApiResponse<StaffPerformanceEntry[]>>(
      `${DASHBOARD_BASE}/staff-performance`,
      { params }
    );
    return res.data.data;
  }

  async getInventoryAlerts(storeId?: number): Promise<InventoryAlerts> {
    const res = await api.get<HospitalityApiResponse<InventoryAlerts>>(
      `${DASHBOARD_BASE}/inventory-alerts`,
      { params: storeId ? { storeId } : undefined }
    );
    return res.data.data;
  }

  // ---- Additional reports ----

  async getTableTurns(params?: DashboardDateFilters) {
    return (await api.get(`${REPORTS_BASE}/table-turns`, { params })).data;
  }

  async getVoidsComps(params?: DashboardDateFilters) {
    return (await api.get(`${REPORTS_BASE}/voids-comps`, { params })).data;
  }

  async getHourlySales(params?: { storeId?: number; date?: string }) {
    return (await api.get(`${REPORTS_BASE}/hourly-sales`, { params })).data;
  }
}

export default ReportsService.getInstance();
