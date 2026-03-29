import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react';
import reservationsService from '@/api/services/reservationsService';
import type {
  Reservation,
  CreateReservationRequest,
  WaitlistEntry,
  AddWaitlistEntryRequest,
  EstimatedWait,
  Pagination,
} from '@/types/hospitality';

interface ReservationsContextType {
  reservations: Reservation[];
  todayReservations: Reservation[];
  waitlist: WaitlistEntry[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  loadReservations: (params?: {
    storeId?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
  }) => Promise<void>;
  loadTodayReservations: (storeId?: number) => Promise<void>;
  createReservation: (body: CreateReservationRequest) => Promise<Reservation>;
  confirmReservation: (id: number) => Promise<void>;
  seatReservation: (id: number, tableId?: number) => Promise<void>;
  cancelReservation: (id: number, reason?: string) => Promise<void>;
  noShowReservation: (id: number) => Promise<void>;
  loadWaitlist: (storeId?: number) => Promise<void>;
  addToWaitlist: (body: AddWaitlistEntryRequest) => Promise<WaitlistEntry>;
  getEstimatedWait: (
    storeId: number,
    partySize: number
  ) => Promise<EstimatedWait>;
}

const ReservationsContext = createContext<ReservationsContextType | undefined>(
  undefined
);

export const ReservationsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [todayReservations, setTodayReservations] = useState<Reservation[]>(
    []
  );
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReservations = useCallback(
    async (params?: {
      storeId?: number;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await reservationsService.list({ ...params, limit: 50 });
        setReservations(res.data);
        setPagination(res.pagination);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const loadTodayReservations = useCallback(async (storeId?: number) => {
    try {
      const data = await reservationsService.getToday(storeId);
      setTodayReservations(data);
    } catch {
      // silent
    }
  }, []);

  const createReservation = useCallback(
    async (body: CreateReservationRequest) => {
      const res = await reservationsService.create(body);
      setReservations((prev) => [res, ...prev]);
      return res;
    },
    []
  );

  const confirmReservation = useCallback(async (id: number) => {
    const updated = await reservationsService.confirm(id);
    setReservations((prev) => prev.map((r) => (r.id === id ? updated : r)));
    setTodayReservations((prev) =>
      prev.map((r) => (r.id === id ? updated : r))
    );
  }, []);

  const seatReservation = useCallback(
    async (id: number, tableId?: number) => {
      const updated = await reservationsService.seat(
        id,
        tableId ? { tableId } : undefined
      );
      setReservations((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setTodayReservations((prev) =>
        prev.map((r) => (r.id === id ? updated : r))
      );
    },
    []
  );

  const cancelReservation = useCallback(
    async (id: number, reason?: string) => {
      await reservationsService.cancel(id, reason ? { reason } : undefined);
      setReservations((prev) => prev.filter((r) => r.id !== id));
      setTodayReservations((prev) => prev.filter((r) => r.id !== id));
    },
    []
  );

  const noShowReservation = useCallback(async (id: number) => {
    const updated = await reservationsService.noShow(id);
    setReservations((prev) => prev.map((r) => (r.id === id ? updated : r)));
    setTodayReservations((prev) =>
      prev.map((r) => (r.id === id ? updated : r))
    );
  }, []);

  const loadWaitlist = useCallback(async (storeId?: number) => {
    try {
      const data = await reservationsService.listWaitlist(
        storeId ? { storeId } : undefined
      );
      setWaitlist(data);
    } catch {
      // silent
    }
  }, []);

  const addToWaitlist = useCallback(
    async (body: AddWaitlistEntryRequest) => {
      const entry = await reservationsService.addToWaitlist(body);
      setWaitlist((prev) => [...prev, entry]);
      return entry;
    },
    []
  );

  const getEstimatedWait = useCallback(
    async (storeId: number, partySize: number) => {
      return reservationsService.getEstimatedWait({ storeId, partySize });
    },
    []
  );

  return (
    <ReservationsContext.Provider
      value={{
        reservations,
        todayReservations,
        waitlist,
        pagination,
        isLoading,
        error,
        loadReservations,
        loadTodayReservations,
        createReservation,
        confirmReservation,
        seatReservation,
        cancelReservation,
        noShowReservation,
        loadWaitlist,
        addToWaitlist,
        getEstimatedWait,
      }}
    >
      {children}
    </ReservationsContext.Provider>
  );
};

export function useReservations() {
  const ctx = useContext(ReservationsContext);
  if (!ctx)
    throw new Error(
      'useReservations must be used within ReservationsProvider'
    );
  return ctx;
}
