import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react';
import cashTillService from '@/api/services/cashTillService';
import type {
  CashDrawer,
  CashEvent,
  RecordCashEventRequest,
  ShiftCashSummary,
  BlindCashUp,
  Pagination,
} from '@/types/hospitality';

interface CashTillContextType {
  drawers: CashDrawer[];
  events: CashEvent[];
  shiftSummary: ShiftCashSummary | null;
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  loadDrawers: (storeId?: number) => Promise<void>;
  loadEvents: (params?: {
    storeId?: number;
    shiftId?: number;
    drawerId?: number;
    eventType?: string;
    page?: number;
  }) => Promise<void>;
  recordEvent: (body: RecordCashEventRequest) => Promise<CashEvent>;
  loadShiftSummary: (shiftId: number) => Promise<void>;
  getBlindCashUp: (
    shiftId: number,
    drawerId: number
  ) => Promise<BlindCashUp>;
}

const CashTillContext = createContext<CashTillContextType | undefined>(
  undefined
);

export const CashTillProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [drawers, setDrawers] = useState<CashDrawer[]>([]);
  const [events, setEvents] = useState<CashEvent[]>([]);
  const [shiftSummary, setShiftSummary] = useState<ShiftCashSummary | null>(
    null
  );
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDrawers = useCallback(async (storeId?: number) => {
    try {
      const data = await cashTillService.getDrawers(storeId);
      setDrawers(data);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const loadEvents = useCallback(
    async (params?: {
      storeId?: number;
      shiftId?: number;
      drawerId?: number;
      eventType?: string;
      page?: number;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await cashTillService.listEvents({
          ...params,
          limit: 50,
        });
        setEvents(res.data);
        setPagination(res.pagination);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const recordEvent = useCallback(
    async (body: RecordCashEventRequest) => {
      const event = await cashTillService.recordEvent(body);
      setEvents((prev) => [event, ...prev]);
      return event;
    },
    []
  );

  const loadShiftSummary = useCallback(async (shiftId: number) => {
    const data = await cashTillService.getShiftCashSummary(shiftId);
    setShiftSummary(data);
  }, []);

  const getBlindCashUp = useCallback(
    async (shiftId: number, drawerId: number) => {
      return cashTillService.getBlindCashUp(shiftId, drawerId);
    },
    []
  );

  return (
    <CashTillContext.Provider
      value={{
        drawers,
        events,
        shiftSummary,
        pagination,
        isLoading,
        error,
        loadDrawers,
        loadEvents,
        recordEvent,
        loadShiftSummary,
        getBlindCashUp,
      }}
    >
      {children}
    </CashTillContext.Provider>
  );
};

export function useCashTill() {
  const ctx = useContext(CashTillContext);
  if (!ctx)
    throw new Error('useCashTill must be used within CashTillProvider');
  return ctx;
}
