import api from '../api';
import type {
  ActiveTableCheck,
  Table,
  FloorPlan,
  FloorSection,
  ServerAssignment,
  TableCombination,
  UpdateTableStatusRequest,
  AssignServerRequest,
  CombineTablesRequest,
  PaginatedResponse,
} from '../../types/hospitality';

const BASE = '/hospitality/floor-plans';

function unwrapArray<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data.data)) return data.data;
    if (data.data && typeof data.data === 'object' && Array.isArray(data.data.data)) return data.data.data;
  }
  return [];
}

function unwrapOne<T = any>(data: any): T {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (data.data !== undefined && !Array.isArray(data.data) && typeof data.data === 'object' && data.data.data !== undefined) {
      return data.data.data;
    }
    if (data.data !== undefined) return data.data;
  }
  return data;
}

function buildServerName(server?: { firstName?: string; lastName?: string } | null): string | undefined {
  if (!server) return undefined;
  const full = `${server.firstName ?? ''} ${server.lastName ?? ''}`.trim();
  return full || undefined;
}

function normalizeActiveCheck(raw: any): ActiveTableCheck | null {
  if (!raw) return null;
  return {
    id: Number(raw.id),
    checkNumber: raw.checkNumber,
    grandTotal: Number(raw.grandTotal ?? 0),
    balanceDue: Number(raw.balanceDue ?? 0),
    guestCount: Number(raw.guestCount ?? 0),
    openedAt: raw.openedAt ?? raw.createdAt ?? new Date().toISOString(),
    status: raw.status,
    serverId: raw.server?.id ?? raw.serverId,
    serverName: raw.serverName ?? buildServerName(raw.server),
    itemCount: raw.itemCount ?? raw._count?.items ?? 0,
  };
}

function normalizeTable(raw: any): Table {
  const resolvedCheck = normalizeActiveCheck(raw?.activeCheck ?? raw?.checks?.[0]);
  return {
    id: Number(raw.id),
    storeId: Number(raw.storeId ?? raw.section?.storeId ?? 0),
    sectionId: Number(raw.sectionId),
    name: raw.name ?? raw.label ?? `T${raw.number ?? raw.tableNumber ?? raw.id}`,
    tableNumber: String(raw.tableNumber ?? raw.number ?? raw.id),
    seats: Number(raw.seats ?? raw.capacity ?? 0),
    status: raw.status,
    positionX: raw.positionX ?? raw.posX ?? undefined,
    positionY: raw.positionY ?? raw.posY ?? undefined,
    width: raw.width ?? undefined,
    height: raw.height ?? undefined,
    shape: raw.shape ?? undefined,
    currentCheckId: raw.currentCheckId ?? resolvedCheck?.id ?? null,
    currentServerId: raw.currentServerId ?? resolvedCheck?.serverId ?? null,
    combinationId: raw.combinationId ?? null,
    checkOpenedAt: raw.checkOpenedAt ?? resolvedCheck?.openedAt ?? null,
    activeCheck: resolvedCheck,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

class TablesService {
  private static instance: TablesService;
  private constructor() {}

  static getInstance(): TablesService {
    if (!TablesService.instance) {
      TablesService.instance = new TablesService();
    }
    return TablesService.instance;
  }

  async getFloorPlans(params?: {
    storeId?: number;
    isActive?: boolean;
  }): Promise<FloorPlan[]> {
    const res = await api.get<any>(BASE, { params });
    return unwrapArray<FloorPlan>(res.data);
  }

  async getFloorPlan(id: number): Promise<FloorPlan> {
    const res = await api.get<any>(`${BASE}/${id}`);
    return unwrapOne<FloorPlan>(res.data);
  }

  async getFloorPlanSections(floorPlanId: number): Promise<FloorSection[]> {
    const res = await api.get<any>(`${BASE}/${floorPlanId}/sections`);
    return unwrapArray<FloorSection>(res.data);
  }

  async getTables(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: string;
    storeId?: number;
    sectionId?: number;
  }): Promise<PaginatedResponse<Table>> {
    const res = await api.get<any>(`${BASE}/tables`, { params });
    const rawArray = unwrapArray(res.data);
    return {
      ...res.data,
      data: rawArray.map(normalizeTable),
    };
  }

  async getTable(id: number): Promise<Table> {
    const res = await api.get<any>(`${BASE}/tables/${id}`);
    return normalizeTable(unwrapOne(res.data));
  }

  async updateTableStatus(
    id: number,
    body: UpdateTableStatusRequest
  ): Promise<Table> {
    const res = await api.patch<any>(`${BASE}/tables/${id}/status`, body);
    return normalizeTable(unwrapOne(res.data));
  }

  async getServerAssignments(params?: {
    shiftId?: number;
    storeId?: number;
  }): Promise<ServerAssignment[]> {
    const res = await api.get<any>(`${BASE}/server-assignments`, { params });
    return unwrapArray<ServerAssignment>(res.data);
  }

  async assignServer(body: AssignServerRequest): Promise<ServerAssignment> {
    const res = await api.post<any>(`${BASE}/server-assignments`, body);
    return unwrapOne<ServerAssignment>(res.data);
  }

  async unassignServer(id: number): Promise<void> {
    await api.delete(`${BASE}/server-assignments/${id}`);
  }

  async combineTables(body: CombineTablesRequest): Promise<TableCombination> {
    const res = await api.post<any>(`${BASE}/combinations`, body);
    return unwrapOne<TableCombination>(res.data);
  }

  async listCombinations(storeId?: number): Promise<TableCombination[]> {
    const res = await api.get<any>(`${BASE}/combinations`, {
      params: storeId ? { storeId } : undefined,
    });
    return unwrapArray<TableCombination>(res.data);
  }

  async uncombineTables(id: number): Promise<void> {
    await api.delete(`${BASE}/combinations/${id}`);
  }
}

export default TablesService.getInstance();
