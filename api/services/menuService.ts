import api from '../api';
import type {
  Menu,
  MenuItem,
  ModifierGroup,
  ToggleItemAvailabilityRequest,
  HospitalityApiResponse,
  PaginatedResponse,
} from '../../types/hospitality';

const BASE = '/hospitality/menus';

class MenuService {
  private static instance: MenuService;
  private constructor() {}

  static getInstance(): MenuService {
    if (!MenuService.instance) {
      MenuService.instance = new MenuService();
    }
    return MenuService.instance;
  }

  async getMenus(params?: {
    page?: number;
    limit?: number;
    storeId?: number;
    menuType?: string;
    isActive?: boolean;
  }): Promise<PaginatedResponse<Menu>> {
    const res = await api.get<PaginatedResponse<Menu>>(BASE, { params });
    return res.data;
  }

  async getMenuItems(params?: {
    search?: string;
    isAvailable?: boolean;
    availableOnly?: boolean;
    menuId?: number;
    categoryId?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<MenuItem>> {
    const cleanParams = params ? Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)
    ) : undefined;
    const res = await api.get<PaginatedResponse<MenuItem>>(`${BASE}/items`, {
      params: cleanParams,
    });
    return res.data;
  }

  async getMenuItem(id: number): Promise<MenuItem> {
    const res = await api.get<HospitalityApiResponse<MenuItem>>(
      `${BASE}/items/${id}`
    );
    return res.data.data;
  }

  async toggleItemAvailability(
    id: number,
    body: ToggleItemAvailabilityRequest
  ): Promise<MenuItem> {
    const res = await api.patch<HospitalityApiResponse<MenuItem>>(
      `${BASE}/items/${id}/availability`,
      body
    );
    return res.data.data;
  }

  async getModifierGroups(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ModifierGroup>> {
    const res = await api.get<PaginatedResponse<ModifierGroup>>(
      `${BASE}/modifier-groups`,
      { params }
    );
    return res.data;
  }
}

export default MenuService.getInstance();
