import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react';
import approvalsService from '@/api/services/approvalsService';
import type {
  ApprovalRequest,
  CreateApprovalRequest,
  ApprovalRequestType,
} from '@/types/hospitality';

interface ApprovalsContextType {
  pendingApprovals: ApprovalRequest[];
  isLoading: boolean;
  error: string | null;
  loadPendingApprovals: (storeId?: number) => Promise<void>;
  createApproval: (body: CreateApprovalRequest) => Promise<ApprovalRequest>;
  approve: (id: number) => Promise<void>;
  reject: (id: number, reason: string) => Promise<void>;
}

const ApprovalsContext = createContext<ApprovalsContextType | undefined>(
  undefined
);

export const ApprovalsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedApprovalsRef = useRef(false);

  const loadPendingApprovals = useCallback(async (storeId?: number) => {
    const isInitialLoad = !hasLoadedApprovalsRef.current;
    if (isInitialLoad) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await approvalsService.listPending(storeId);
      setPendingApprovals(data);
      hasLoadedApprovalsRef.current = true;
    } catch (e: any) {
      if (isInitialLoad) {
        setError(e.message);
      }
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, []);

  const createApproval = useCallback(
    async (body: CreateApprovalRequest) => {
      const approval = await approvalsService.create(body);
      setPendingApprovals((prev) => [approval, ...prev]);
      return approval;
    },
    []
  );

  const approve = useCallback(async (id: number) => {
    await approvalsService.approve(id);
    setPendingApprovals((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const reject = useCallback(async (id: number, reason: string) => {
    await approvalsService.reject(id, { reason });
    setPendingApprovals((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return (
    <ApprovalsContext.Provider
      value={{
        pendingApprovals,
        isLoading,
        error,
        loadPendingApprovals,
        createApproval,
        approve,
        reject,
      }}
    >
      {children}
    </ApprovalsContext.Provider>
  );
};

export function useApprovals() {
  const ctx = useContext(ApprovalsContext);
  if (!ctx)
    throw new Error('useApprovals must be used within ApprovalsProvider');
  return ctx;
}
