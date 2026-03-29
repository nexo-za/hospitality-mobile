import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react';
import paymentsService from '@/api/services/paymentsService';
import type {
  HospitalityPayment,
  HospitalityPaymentType,
  ProcessPaymentRequest,
  PaymentSummary,
  TipsSummary,
} from '@/types/hospitality';

interface PaymentsContextType {
  payments: HospitalityPayment[];
  paymentSummary: PaymentSummary | null;
  tipsSummary: TipsSummary | null;
  isProcessing: boolean;
  error: string | null;
  loadPaymentsForCheck: (checkId: number) => Promise<void>;
  processPayment: (body: ProcessPaymentRequest) => Promise<HospitalityPayment>;
  voidPayment: (id: number) => Promise<void>;
  refundPayment: (id: number, amount?: number) => Promise<void>;
  loadPaymentSummary: (params?: {
    storeId?: number;
    dateFrom?: string;
    dateTo?: string;
  }) => Promise<void>;
  loadTipsSummary: (params?: {
    storeId?: number;
    dateFrom?: string;
    dateTo?: string;
    serverId?: number;
  }) => Promise<void>;
}

const PaymentsContext = createContext<PaymentsContextType | undefined>(
  undefined
);

export const PaymentsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [payments, setPayments] = useState<HospitalityPayment[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(
    null
  );
  const [tipsSummary, setTipsSummary] = useState<TipsSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPaymentsForCheck = useCallback(async (checkId: number) => {
    try {
      const data = await paymentsService.getPaymentsForCheck(checkId);
      setPayments(data);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const processPayment = useCallback(
    async (body: ProcessPaymentRequest) => {
      setIsProcessing(true);
      setError(null);
      try {
        const payment = await paymentsService.processPayment(body);
        setPayments((prev) => [...prev, payment]);
        return payment;
      } catch (e: any) {
        setError(e.message || 'Payment failed');
        throw e;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const voidPayment = useCallback(async (id: number) => {
    const voided = await paymentsService.voidPayment(id);
    setPayments((prev) => prev.map((p) => (p.id === id ? voided : p)));
  }, []);

  const refundPayment = useCallback(async (id: number, amount?: number) => {
    const refunded = await paymentsService.refundPayment(id, amount ? { amount } : undefined);
    setPayments((prev) => prev.map((p) => (p.id === id ? refunded : p)));
  }, []);

  const loadPaymentSummary = useCallback(
    async (params?: {
      storeId?: number;
      dateFrom?: string;
      dateTo?: string;
    }) => {
      const data = await paymentsService.getPaymentSummary(params);
      setPaymentSummary(data);
    },
    []
  );

  const loadTipsSummary = useCallback(
    async (params?: {
      storeId?: number;
      dateFrom?: string;
      dateTo?: string;
      serverId?: number;
    }) => {
      const data = await paymentsService.getTipsSummary(params);
      setTipsSummary(data);
    },
    []
  );

  return (
    <PaymentsContext.Provider
      value={{
        payments,
        paymentSummary,
        tipsSummary,
        isProcessing,
        error,
        loadPaymentsForCheck,
        processPayment,
        voidPayment,
        refundPayment,
        loadPaymentSummary,
        loadTipsSummary,
      }}
    >
      {children}
    </PaymentsContext.Provider>
  );
};

export function usePayments() {
  const ctx = useContext(PaymentsContext);
  if (!ctx)
    throw new Error('usePayments must be used within PaymentsProvider');
  return ctx;
}
