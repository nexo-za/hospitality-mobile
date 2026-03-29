import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react';
import menuService from '@/api/services/menuService';
import type {
  Menu,
  MenuItem,
  ModifierGroup,
  Pagination,
} from '@/types/hospitality';

interface MenuContextType {
  menus: Menu[];
  menuItems: MenuItem[];
  modifierGroups: ModifierGroup[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  selectedCategoryId: number | null;
  setSelectedCategoryId: (id: number | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  refreshMenus: (storeId?: number) => Promise<void>;
  loadMenuItems: (params?: {
    menuId?: number;
    categoryId?: number;
    search?: string;
    page?: number;
    availableOnly?: boolean;
  }) => Promise<void>;
  loadModifierGroups: () => Promise<void>;
  toggleAvailability: (itemId: number, isAvailable: boolean) => Promise<void>;
  getMenuItem: (id: number) => Promise<MenuItem>;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

/**
 * Safely extract the array from API responses that may be wrapped by
 * the global responseHandler middleware: `{ status, data: { data: T[], pagination } }`.
 */
function extractArray<T>(res: any): T[] {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray((res as any)?.data?.data)) return (res as any).data.data;
  if (Array.isArray(res)) return res;
  return [];
}

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');

  const refreshMenus = useCallback(async (storeId?: number) => {
    try {
      const res = await menuService.getMenus({ storeId, isActive: true });
      setMenus(extractArray(res));
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const loadMenuItems = useCallback(
    async (params?: {
      menuId?: number;
      categoryId?: number;
      search?: string;
      page?: number;
      availableOnly?: boolean;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await menuService.getMenuItems({
          ...params,
          limit: 100,
        });
        setMenuItems(extractArray(res));
        setPagination(
          res.pagination ?? (res as any).data?.pagination ?? null
        );
      } catch (e: any) {
        setError(e.message || 'Failed to load menu items');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const loadModifierGroups = useCallback(async () => {
    try {
      const res = await menuService.getModifierGroups({ limit: 100 });
      setModifierGroups(extractArray(res));
    } catch {
      // silent
    }
  }, []);

  const toggleAvailability = useCallback(
    async (itemId: number, isAvailable: boolean) => {
      const updated = await menuService.toggleItemAvailability(itemId, {
        isAvailable,
      });
      setMenuItems((prev) =>
        prev.map((i) => (i.id === itemId ? updated : i))
      );
    },
    []
  );

  const getMenuItem = useCallback(async (id: number) => {
    return menuService.getMenuItem(id);
  }, []);

  return (
    <MenuContext.Provider
      value={{
        menus,
        menuItems,
        modifierGroups,
        pagination,
        isLoading,
        error,
        selectedCategoryId,
        setSelectedCategoryId,
        searchQuery,
        setSearchQuery,
        refreshMenus,
        loadMenuItems,
        loadModifierGroups,
        toggleAvailability,
        getMenuItem,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
};

export function useMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu must be used within MenuProvider');
  return ctx;
}
