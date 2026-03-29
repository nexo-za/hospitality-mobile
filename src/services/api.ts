interface ServerError {
  data: {
    data: any;
    message: string;
    path: string;
    requestId: string;
    status: string;
    timestamp: string;
  };  
  message: string;
  path: string;
  requestId: string;
  status: string;
  timestamp: string;
}

interface ShiftDetailsResponse {
  status: string;
  message: string;
  data: {
    store_name: string;
    staff: Array<{
      staff_id: string;
      staff_name: string;
    }>;
    starting_cash: number;
    total_sales: string;
    refunds: number;
    discounts: number;
    cash_sales: string;
    card_sales: string;
  };
  timestamp: string;
  path: string;
  requestId: string;
}

