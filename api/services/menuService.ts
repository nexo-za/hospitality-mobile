import api from '../api';
import type {
  Menu,
  MenuItem,
  MenuCategory,
  ModifierGroup,
  HospitalityApiResponse,
  PaginatedResponse,
} from '../../types/hospitality';

const BASE = '/hospitality/menus';

/**
 * The backend returns modifier data via a junction table shape:
 *   item.modifierGroups[].modifierGroup.modifiers[]
 * and uses `priceAdjustment` on modifiers. The mobile types now match
 * this shape directly so no normalization is required.
 *
 * Prices come back as Decimal strings from Prisma – we coerce them to
 * numbers on list/detail reads so the UI can do arithmetic safely.
 */
function coerceItemPrices(item: any): MenuItem {
  if (item.price != null) item.price = Number(item.price);
  if (item.costPrice != null) item.costPrice = Number(item.costPrice);
  item.variants?.forEach((v: any) => {
    if (v.price != null) v.price = Number(v.price);
  });
  item.modifierGroups?.forEach((j: any) => {
    j.modifierGroup?.modifiers?.forEach((m: any) => {
      if (m.priceAdjustment != null) m.priceAdjustment = Number(m.priceAdjustment);
    });
  });
  // Ensure arrays always exist even if backend omits them
  if (!item.tags) item.tags = [];
  if (!item.allergens) item.allergens = [];
  if (!item.dietaryFlags) item.dietaryFlags = [];
  return item as MenuItem;
}

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

  async getMenuById(id: number): Promise<Menu> {
    const res = await api.get<HospitalityApiResponse<Menu>>(`${BASE}/${id}`);
    const menu = res.data.data;
    // Coerce prices in the nested tree
    menu.categories?.forEach((cat) => {
      cat.items?.forEach((item) => coerceItemPrices(item));
    });
    return menu;
  }

  async getMenuCategories(menuId: number): Promise<MenuCategory[]> {
    const res = await api.get<HospitalityApiResponse<MenuCategory[]>>(
      `${BASE}/${menuId}/categories`
    );
    return res.data.data;
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
    const cleanParams = params
      ? Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)
        )
      : undefined;
    const res = await api.get<PaginatedResponse<MenuItem>>(`${BASE}/items`, {
      params: cleanParams,
    });
    // Coerce prices
    const items = Array.isArray(res.data.data) ? res.data.data : [];
    items.forEach(coerceItemPrices);
    return res.data;
  }

  async getMenuItem(id: number): Promise<MenuItem> {
    const res = await api.get<HospitalityApiResponse<MenuItem>>(
      `${BASE}/items/${id}`
    );
    return coerceItemPrices(res.data.data);
  }

  async toggleItemAvailability(id: number): Promise<MenuItem> {
    const res = await api.patch<HospitalityApiResponse<MenuItem>>(
      `${BASE}/items/${id}/availability`
    );
    return coerceItemPrices(res.data.data);
  }

  async getModifierGroups(params?: {
    page?: number;
    limit?: number;
  }): Promise<ModifierGroup[]> {
    const res = await api.get<any>(`${BASE}/modifier-groups`, { params });
    const data = res.data?.data ?? res.data;
    const groups = Array.isArray(data) ? data : [];
    // Coerce modifier prices
    groups.forEach((g: any) => {
      g.modifiers?.forEach((m: any) => {
        if (m.priceAdjustment != null) m.priceAdjustment = Number(m.priceAdjustment);
      });
    });
    return groups;
  }
}

export default MenuService.getInstance();
