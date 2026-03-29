import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react';
import guestsService from '@/api/services/guestsService';
import type {
  GuestProfile,
  CreateGuestRequest,
  GuestHistoryEntry,
  Pagination,
} from '@/types/hospitality';

interface GuestsContextType {
  guests: GuestProfile[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  loadGuests: (params?: {
    page?: number;
    limit?: number;
    isVIP?: boolean;
    search?: string;
  }) => Promise<void>;
  createGuest: (body: CreateGuestRequest) => Promise<GuestProfile>;
  getGuest: (id: number) => Promise<GuestProfile>;
  getGuestHistory: (id: number) => Promise<GuestHistoryEntry[]>;
}

const GuestsContext = createContext<GuestsContextType | undefined>(undefined);

export const GuestsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [guests, setGuests] = useState<GuestProfile[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGuests = useCallback(
    async (params?: {
      page?: number;
      limit?: number;
      isVIP?: boolean;
      search?: string;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await guestsService.list(params);
        setGuests(res.data);
        setPagination(res.pagination);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const createGuest = useCallback(async (body: CreateGuestRequest) => {
    const guest = await guestsService.create(body);
    setGuests((prev) => [guest, ...prev]);
    return guest;
  }, []);

  const getGuest = useCallback(async (id: number) => {
    return guestsService.get(id);
  }, []);

  const getGuestHistory = useCallback(async (id: number) => {
    return guestsService.getHistory(id);
  }, []);

  return (
    <GuestsContext.Provider
      value={{
        guests,
        pagination,
        isLoading,
        error,
        loadGuests,
        createGuest,
        getGuest,
        getGuestHistory,
      }}
    >
      {children}
    </GuestsContext.Provider>
  );
};

export function useGuests() {
  const ctx = useContext(GuestsContext);
  if (!ctx) throw new Error('useGuests must be used within GuestsProvider');
  return ctx;
}
