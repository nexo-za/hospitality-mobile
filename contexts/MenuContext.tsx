import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react';
import menuService from '@/api/services/menuService';
import type {
  Menu,
  MenuCategory,
  MenuItem,
  ModifierGroup,
  Pagination,
} from '@/types/hospitality';

interface MenuContextType {
  // Data
  menus: Menu[];
  selectedMenu: Menu | null;
  categories: MenuCategory[];
  menuItems: MenuItem[];
  modifierGroups: ModifierGroup[];
  pagination: Pagination | null;

  // State
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Actions
  refreshMenus: (storeId?: number) => Promise<void>;
  selectMenu: (menu: Menu) => Promise<void>;
  loadMenuItems: (params?: {
    menuId?: number;
    categoryId?: number;
    search?: string;
    page?: number;
    availableOnly?: boolean;
  }) => Promise<void>;
  loadMoreItems: () => Promise<void>;
  loadModifierGroups: () => Promise<void>;
  toggleAvailability: (itemId: number) => Promise<void>;
  getMenuItem: (id: number) => Promise<MenuItem>;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

function extractArray<T>(res: any): T[] {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res)) return res;
  return [];
}

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedItemsRef = useRef(false);
  const lastItemParamsRef = useRef<any>(null);

  const refreshMenus = useCallback(async (storeId?: number) => {
    try {
      const res = await menuService.getMenus({ storeId, isActive: true });
      const menuList = extractArray<Menu>(res);
      setMenus(menuList);
      // Auto-select first (default or first) menu if none selected
      if (menuList.length > 0) {
        const defaultMenu = menuList.find((m) => m.isDefault) || menuList[0];
        setSelectedMenu((prev) => {
          if (prev && menuList.some((m) => m.id === prev.id)) return prev;
          return defaultMenu;
        });
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const selectMenu = useCallback(async (menu: Menu) => {
    setSelectedMenu(menu);
    setCategories([]);
    setMenuItems([]);
    setPagination(null);
    hasLoadedItemsRef.current = false;

    try {
      const fullMenu = await menuService.getMenuById(menu.id);
      setCategories(fullMenu.categories ?? []);
      // Flatten items from nested categories for list view
      const allItems: MenuItem[] = [];
      fullMenu.categories?.forEach((cat) => {
        cat.items?.forEach((item) => {
          if (!item.category) {
            item.category = { id: cat.id, name: cat.name, menuId: cat.menuId };
          }
          allItems.push(item);
        });
      });
      setMenuItems(allItems);
      hasLoadedItemsRef.current = true;
    } catch (e: any) {
      setError(e.message || 'Failed to load menu');
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
      const isInitialLoad = !hasLoadedItemsRef.current;
      if (isInitialLoad) setIsLoading(true);
      setError(null);
      lastItemParamsRef.current = params;

      try {
        const res = await menuService.getMenuItems({
          ...params,
          limit: 50,
        });
        setMenuItems(extractArray(res));
        setPagination(
          res.pagination ?? (res as any).data?.pagination ?? null
        );
        hasLoadedItemsRef.current = true;
      } catch (e: any) {
        if (isInitialLoad) {
          setError(e.message || 'Failed to load menu items');
        }
      } finally {
        if (isInitialLoad) setIsLoading(false);
      }
    },
    []
  );

  const loadMoreItems = useCallback(async () => {
    if (!pagination?.hasNext || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = (pagination?.page ?? 1) + 1;
      const res = await menuService.getMenuItems({
        ...lastItemParamsRef.current,
        page: nextPage,
        limit: 50,
      });
      const newItems = extractArray<MenuItem>(res);
      setMenuItems((prev) => [...prev, ...newItems]);
      setPagination(
        res.pagination ?? (res as any).data?.pagination ?? null
      );
    } catch {
      // Silent – user can retry
    } finally {
      setIsLoadingMore(false);
    }
  }, [pagination, isLoadingMore]);

  const loadModifierGroups = useCallback(async () => {
    try {
      const groups = await menuService.getModifierGroups({ limit: 200 });
      setModifierGroups(Array.isArray(groups) ? groups : []);
    } catch {
      // silent
    }
  }, []);

  const toggleAvailability = useCallback(async (itemId: number) => {
    const updated = await menuService.toggleItemAvailability(itemId);
    setMenuItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, isAvailable: updated.isAvailable } : i
      )
    );
  }, []);

  const getMenuItem = useCallback(async (id: number) => {
    return menuService.getMenuItem(id);
  }, []);

  return (
    <MenuContext.Provider
      value={{
        menus,
        selectedMenu,
        categories,
        menuItems,
        modifierGroups,
        pagination,
        isLoading,
        isLoadingMore,
        error,
        refreshMenus,
        selectMenu,
        loadMenuItems,
        loadMoreItems,
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
