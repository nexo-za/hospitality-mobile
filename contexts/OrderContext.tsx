import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react';
import ordersService from '@/api/services/ordersService';
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
  TransferCheckRequest,
  SplitCheckRequest,
  SplitCheckResult,
  Pagination,
} from '@/types/hospitality';

interface OrderContextType {
  activeChecks: Check[];
  currentCheck: Check | null;
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  loadActiveChecks: (params?: {
    storeId?: number;
    status?: string;
    serverId?: number;
    tableId?: number;
    shiftId?: number;
    page?: number;
  }) => Promise<void>;
  loadCheck: (id: number) => Promise<Check>;
  createCheck: (body: CreateCheckRequest) => Promise<Check>;
  closeCheck: (id: number) => Promise<void>;
  voidCheck: (id: number, reason: string) => Promise<void>;
  reopenCheck: (id: number) => Promise<void>;
  transferCheck: (id: number, body: TransferCheckRequest) => Promise<void>;
  splitCheck: (
    id: number,
    body: SplitCheckRequest
  ) => Promise<SplitCheckResult>;
  addItem: (checkId: number, body: AddCheckItemRequest) => Promise<CheckItem>;
  updateItem: (
    itemId: number,
    body: UpdateCheckItemRequest
  ) => Promise<CheckItem>;
  removeItem: (itemId: number) => Promise<void>;
  voidItem: (itemId: number, body: VoidCheckItemRequest) => Promise<CheckItem>;
  fireItems: (checkId: number, body: FireItemsRequest) => Promise<void>;
  addCourse: (checkId: number, body: AddCourseRequest) => Promise<Course>;
  fireCourse: (courseId: number) => Promise<void>;
  setCurrentCheck: (check: Check | null) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

function extractArray<T>(res: any): T[] {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray((res as any)?.data?.data)) return (res as any).data.data;
  if (Array.isArray(res)) return res;
  return [];
}

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeChecks, setActiveChecks] = useState<Check[]>([]);
  const [currentCheck, setCurrentCheck] = useState<Check | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActiveChecks = useCallback(
    async (params?: {
      storeId?: number;
      status?: string;
      serverId?: number;
      tableId?: number;
      shiftId?: number;
      page?: number;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await ordersService.listChecks({
          ...params,
          status: params?.status,
          limit: 50,
        });
        setActiveChecks(extractArray(res));
        setPagination(res.pagination ?? (res as any).data?.pagination ?? null);
      } catch (e: any) {
        setError(e.message || 'Failed to load checks');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const loadCheck = useCallback(async (id: number) => {
    const check = await ordersService.getCheck(id);
    setCurrentCheck(check);
    return check;
  }, []);

  const createCheck = useCallback(async (body: CreateCheckRequest) => {
    const check = await ordersService.createCheck(body);
    setActiveChecks((prev) => [check, ...prev]);
    setCurrentCheck(check);
    return check;
  }, []);

  const closeCheck = useCallback(
    async (id: number) => {
      const closed = await ordersService.closeCheck(id);
      setActiveChecks((prev) =>
        prev.map((c) => (c.id === id ? closed : c))
      );
      if (currentCheck?.id === id) setCurrentCheck(closed);
    },
    [currentCheck]
  );

  const voidCheck = useCallback(
    async (id: number, reason: string) => {
      const voided = await ordersService.voidCheck(id, { reason });
      setActiveChecks((prev) => prev.filter((c) => c.id !== id));
      if (currentCheck?.id === id) setCurrentCheck(voided);
    },
    [currentCheck]
  );

  const reopenCheck = useCallback(async (id: number) => {
    const reopened = await ordersService.reopenCheck(id);
    setActiveChecks((prev) => [reopened, ...prev]);
    setCurrentCheck(reopened);
  }, []);

  const transferCheck = useCallback(
    async (id: number, body: TransferCheckRequest) => {
      const transferred = await ordersService.transferCheck(id, body);
      setActiveChecks((prev) =>
        prev.map((c) => (c.id === id ? transferred : c))
      );
      if (currentCheck?.id === id) setCurrentCheck(transferred);
    },
    [currentCheck]
  );

  const splitCheck = useCallback(
    async (id: number, body: SplitCheckRequest) => {
      const result = await ordersService.splitCheck(id, body);
      setActiveChecks((prev) => {
        const without = prev.filter((c) => c.id !== id);
        return [result.originalCheck, ...result.newChecks, ...without];
      });
      return result;
    },
    []
  );

  const addItem = useCallback(
    async (checkId: number, body: AddCheckItemRequest) => {
      const item = await ordersService.addItem(checkId, body);
      if (currentCheck?.id === checkId) {
        await loadCheck(checkId);
      }
      return item;
    },
    [currentCheck, loadCheck]
  );

  const updateItem = useCallback(
    async (itemId: number, body: UpdateCheckItemRequest) => {
      const item = await ordersService.updateItem(itemId, body);
      if (currentCheck) {
        await loadCheck(currentCheck.id);
      }
      return item;
    },
    [currentCheck, loadCheck]
  );

  const removeItem = useCallback(
    async (itemId: number) => {
      await ordersService.removeItem(itemId);
      if (currentCheck) {
        await loadCheck(currentCheck.id);
      }
    },
    [currentCheck, loadCheck]
  );

  const voidItem = useCallback(
    async (itemId: number, body: VoidCheckItemRequest) => {
      const item = await ordersService.voidItem(itemId, body);
      if (currentCheck) {
        await loadCheck(currentCheck.id);
      }
      return item;
    },
    [currentCheck, loadCheck]
  );

  const fireItems = useCallback(
    async (checkId: number, body: FireItemsRequest) => {
      await ordersService.fireItems(checkId, body);
      if (currentCheck?.id === checkId) {
        await loadCheck(checkId);
      }
    },
    [currentCheck, loadCheck]
  );

  const addCourse = useCallback(
    async (checkId: number, body: AddCourseRequest) => {
      const course = await ordersService.addCourse(checkId, body);
      if (currentCheck?.id === checkId) {
        await loadCheck(checkId);
      }
      return course;
    },
    [currentCheck, loadCheck]
  );

  const fireCourse = useCallback(
    async (courseId: number) => {
      await ordersService.fireCourse(courseId);
      if (currentCheck) {
        await loadCheck(currentCheck.id);
      }
    },
    [currentCheck, loadCheck]
  );

  return (
    <OrderContext.Provider
      value={{
        activeChecks,
        currentCheck,
        pagination,
        isLoading,
        error,
        loadActiveChecks,
        loadCheck,
        createCheck,
        closeCheck,
        voidCheck,
        reopenCheck,
        transferCheck,
        splitCheck,
        addItem,
        updateItem,
        removeItem,
        voidItem,
        fireItems,
        addCourse,
        fireCourse,
        setCurrentCheck,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrder must be used within OrderProvider');
  return ctx;
}
