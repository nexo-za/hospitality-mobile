import api from '../api';
import type {
  Check,
  CheckItem,
  Course,
  CreateCheckRequest,
  AddCheckItemRequest,
  UpdateCheckItemRequest,
  VoidCheckItemRequest,
  FireItemsRequest,
  AddCourseRequest,
  VoidCheckRequest,
  TransferCheckRequest,
  SplitCheckRequest,
  SplitCheckResult,
  HospitalityApiResponse,
  PaginatedResponse,
} from '../../types/hospitality';

const BASE = '/hospitality/checks';

function mapCheck(check: any): Check {
  if (!check) return check;
  const server = check.server;
  const table = check.table;
  return {
    ...check,
    tableName: check.tableName ?? table?.label ?? table?.number ?? undefined,
    serverName: check.serverName ?? (server ? `${server.firstName || ''} ${server.lastName || ''}`.trim() : undefined),
    sectionName: check.sectionName ?? table?.section?.name ?? undefined,
    subtotal: check.subtotal ?? 0,
    taxAmount: check.taxAmount ?? check.taxTotal ?? 0,
    discountAmount: check.discountAmount ?? check.discountTotal ?? 0,
    serviceChargeAmount: check.serviceChargeAmount ?? check.serviceChargeTotal ?? 0,
    totalAmount: check.totalAmount ?? check.grandTotal ?? 0,
    paidAmount: check.paidAmount ?? 0,
    balanceDue: check.balanceDue ?? (check.totalAmount ?? check.grandTotal ?? 0),
    items: (check.items || []).map((item: any) => ({
      ...item,
      totalPrice: item.totalPrice ?? item.lineTotal ?? (Number(item.unitPrice || 0) * (item.quantity || 1)),
      menuItemName: item.menuItemName ?? item.menuItem?.name ?? 'Unknown Item',
      categoryName: item.categoryName ?? item.menuItem?.category?.name ?? undefined,
    })),
  };
}

class OrdersService {
  private static instance: OrdersService;
  private constructor() {}

  static getInstance(): OrdersService {
    if (!OrdersService.instance) {
      OrdersService.instance = new OrdersService();
    }
    return OrdersService.instance;
  }

  // ---- Checks (Orders) ----

  async createCheck(body: CreateCheckRequest): Promise<Check> {
    const res = await api.post<HospitalityApiResponse<Check>>(BASE, body);
    return mapCheck(res.data.data);
  }

  async listChecks(params?: {
    page?: number;
    limit?: number;
    storeId?: number;
    status?: string;
    serverId?: number;
    tableId?: number;
    shiftId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PaginatedResponse<Check>> {
    const res = await api.get<PaginatedResponse<Check>>(BASE, { params });
    return {
      ...res.data,
      data: (res.data.data || []).map(mapCheck),
    };
  }

  async getCheck(id: number): Promise<Check> {
    const res = await api.get<HospitalityApiResponse<Check>>(`${BASE}/${id}`);
    return mapCheck(res.data.data);
  }

  async closeCheck(id: number): Promise<Check> {
    const res = await api.post<HospitalityApiResponse<Check>>(
      `${BASE}/${id}/close`
    );
    return mapCheck(res.data.data);
  }

  async voidCheck(id: number, body: VoidCheckRequest): Promise<Check> {
    const res = await api.post<HospitalityApiResponse<Check>>(
      `${BASE}/${id}/void`,
      body
    );
    return mapCheck(res.data.data);
  }

  async reopenCheck(id: number): Promise<Check> {
    const res = await api.post<HospitalityApiResponse<Check>>(
      `${BASE}/${id}/reopen`
    );
    return mapCheck(res.data.data);
  }

  async transferCheck(
    id: number,
    body: TransferCheckRequest
  ): Promise<Check> {
    const res = await api.post<HospitalityApiResponse<Check>>(
      `${BASE}/${id}/transfer`,
      body
    );
    return mapCheck(res.data.data);
  }

  async splitCheck(
    id: number,
    body: SplitCheckRequest
  ): Promise<SplitCheckResult> {
    const res = await api.post<HospitalityApiResponse<SplitCheckResult>>(
      `${BASE}/${id}/split`,
      body
    );
    const data = res.data.data;
    return {
      ...data,
      originalCheck: mapCheck(data.originalCheck),
      newChecks: (data.newChecks || []).map(mapCheck),
    };
  }

  // ---- Items ----

  async addItem(checkId: number, body: AddCheckItemRequest): Promise<CheckItem> {
    const res = await api.post<HospitalityApiResponse<CheckItem>>(
      `${BASE}/${checkId}/items`,
      body
    );
    return res.data.data;
  }

  async updateItem(
    itemId: number,
    body: UpdateCheckItemRequest
  ): Promise<CheckItem> {
    const res = await api.put<HospitalityApiResponse<CheckItem>>(
      `${BASE}/items/${itemId}`,
      body
    );
    return res.data.data;
  }

  async removeItem(itemId: number): Promise<void> {
    await api.delete(`${BASE}/items/${itemId}`);
  }

  async voidItem(
    itemId: number,
    body: VoidCheckItemRequest
  ): Promise<CheckItem> {
    const res = await api.post<HospitalityApiResponse<CheckItem>>(
      `${BASE}/items/${itemId}/void`,
      body
    );
    return res.data.data;
  }

  // ---- Fire / Courses ----

  async fireItems(checkId: number, body: FireItemsRequest): Promise<Check> {
    const res = await api.post<HospitalityApiResponse<Check>>(
      `${BASE}/${checkId}/fire`,
      body
    );
    return mapCheck(res.data.data);
  }

  async addCourse(checkId: number, body: AddCourseRequest): Promise<Course> {
    const res = await api.post<HospitalityApiResponse<Course>>(
      `${BASE}/${checkId}/courses`,
      body
    );
    return res.data.data;
  }

  async fireCourse(courseId: number): Promise<void> {
    await api.post(`${BASE}/courses/${courseId}/fire`);
  }
}

export default OrdersService.getInstance();
