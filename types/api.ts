// Common Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Auth Types
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ForgotPasswordRequest {
  username: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  sku: string;
  barcode?: string;
  image_url?: string;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

// Customer Types
export type CustomerType = "WHOLESALE" | "RETAIL";

export interface Customer {
  consumer_id: number;
  fullname: string;
  first_name: string;
  last_name: string;
  surname: string;
  phone: string;
  email: string;
  region_id: number;
  region_name: string;
  dob: string;
  customer_type?: CustomerType;
}

export interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address?: string;
}

export interface CustomersResponse {
  status: string;
  data: Customer[];
  total: number;
  current_page: number;
  per_page: number;
  last_page: number;
}

// Sale Types
export interface Sale {
  sales_id: number;
  consumer_id: number;
  fullname: string;
  surname: string;
  first_name: string;
  last_name: string;
  region_id: number;
  region_name: string;
  category: string;
  device_name: string;
  created_date: string;
  created_by: string | null;
  sales_total: number;
  discount: number;
  payment_type: string;
  status: string;
}

export interface SalesResponse {
  status: string;
  results: number;
  data: Sale[];
  message: string;
  timestamp: string;
  path: string;
  requestId: string;
}

// Shift Types
export interface Shift {
  id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  status: "active" | "completed" | "cancelled";
  total_sales: number;
  total_transactions: number;
  notes?: string;
}

export interface ShiftResponse {
  shift: Shift;
  sales: Sale[];
  summary: {
    total_amount: number;
    total_transactions: number;
    average_transaction: number;
  };
}

// Inventory Types
export interface InventoryResponse {
  status: string;
  results: number;
  data: Array<{
    user: { id: number; first_name: string; last_name: string };
    inventory: any[];
  }>;
  message: string;
  timestamp: string;
  path: string;
  requestId: string;
}

// Region Types
export interface Region {
  region_id: number;
  region_name: string;
  timezone?: string;
  currency?: string;
}

export interface RegionsResponse {
  status: string;
  data: {
    status: string;
    results: number;
    data: Region[];
  };
  timestamp: string;
  requestId: string;
}

// Country Code Types
export interface CountryCode {
  code: string;
  name: string;
  dial_code: string;
}

export interface CountryCodeResponse {
  countries: CountryCode[];
}

// Account Info Types
export interface AccountInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  business_name: string;
  tax_id?: string;
  currency: string;
  timezone: string;
}

export interface AccountInfoResponse {
  account: AccountInfo;
}

export interface UserProduct {
  product_id: number | null;
  item_name: string;
  category: string;
  qty_on_hand: number;
  image: string;
  image_url?: string;
  price: number;
  updated_at: string;
  kiosk: string;
  bundle_id?: number | null;
  sku?: string;
  isBundle?: boolean;
  variant?: string;
}

export interface UserProductsResponse {
  items: UserProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SaleProduct {
  salesproducts_id: number;
  sales_id: number;
  product_id: number;
  quantity: number;
  cost_price: number;
  selling_price: number;
  bundle_id: number | null;
  device_name: string;
  category: string;
  bundle_name: string | null;
}

export interface CategoriesResponse {
  status: string;
  data: string[];
  timestamp?: string;
  requestId?: string;
}

export interface BundleProductsResponse {
  status: string;
  message: string;
  data: {
    bundle: {
      id: number;
      name: string;
      selling_price: number;
      status: number;
      image: string;
      image_url: string;
    };
    categories: Array<{
      category: string;
      total_per_category: number;
      products: Array<{
        id: number;
        product_id: number;
        item_name: string;
        category: string;
        quantity: number;
        actual_quantity: number;
        image: string;
        image_url: string;
        price: number;
        sku: string;
      }>;
    }>;
    max_possible_bundles: number;
  };
  timestamp: string;
  path: string;
  requestId: string;
}

export interface SalesDetails {
  sales_id: number;
  consumer_id: number;
  fullname: string;
  phone: string;
  email?: string;
  id: number;
  store_name: string;
  region_id: number;
  region_name: string;
  sale_date: string;
  staff_id?: string;
  staff_name: string | null;
  notes?: string;
  exchange_notes?: string;
  payment_notes?: string;
  products: SaleProduct[];
}

export interface SalesDetailsResponse {
  status: string;
  message: string;
  data: SalesDetails;
  timestamp: string;
  path: string;
  requestId: string;
}

export interface EcentricPaymentDetails {
  ecentric_transaction_uuid: string;
  ecentric_auth_code: string;
  ecentric_result_code: string;
  ecentric_result_desc?: string;
  ecentric_is_approved?: boolean;
  ecentric_rrn?: string;
  ecentric_card_type?: string;
  ecentric_masked_pan?: string;
  ecentric_aid?: string;
  ecentric_application_id?: string;
  ecentric_terminal_id?: string;
  ecentric_pos_entry_mode?: string;
  ecentric_transaction_type?: string;
  ecentric_approval_status?: string;
  ecentric_receipt_number?: string;
  ecentric_receipt_details?: string | object;
  ecentric_latitude?: string;
  ecentric_longitude?: string;
  ecentric_accuracy?: string;
  ecentric_bank_name?: string;
  ecentric_merchant_id?: string;
  ecentric_batch_number?: string;
}

// CenDroid Payment Types
export enum CenDroidOperation {
  SALE = 'Sale',
  END_OF_DAY = 'EndOfDay',
  REFUND = 'Refund',
  CANCEL = 'Cancel',
  BALANCE_ENQ = 'BalanceEnq',
  CASH_WITHDRAW = 'CashWithdraw',
  PURCHASE_CASHBACK = 'PurchaseCashback',
  REPRINT = 'Reprint',
  REPRINT_LIST = 'ReprintList',
  REPRINT_BANK = 'ReprintBank',
  PARAMETER_DOWNLOAD = 'ParameterDownload'
}

export enum CenDroidTransactionResultCode {
  UNKNOWN = 0,        // Transaction result unknown/undefined
  APPROVE = 1,        // Approve transaction
  DECLINE = 2,        // Decline transaction
  REJECT = 3,         // Reject transaction
  HOST = 4,           // Contact host for authorisation
  VOICE = 5,          // Contact voice centre for authorisation
  COMMS_FAIL = 6      // Comms failure / unable to contact host
}

export interface CenDroidRequest {
  operation: CenDroidOperation;
  time: string;                    // Current time in milliseconds since epoch
  amount: number;                  // Transaction amount
  caller: string;                  // Company name
  invocationKey: string;           // SHA512(SHA256(SHA1(time)))
  ecrHostTransfer?: string;        // Data sent to Postilion in field DE46.16
  reference?: string;              // Text printed on slip
  customHeading?: string;          // Custom heading for balance enquiry
  appName?: string;                // License name for multi-license terminals
  cashbackAmount?: number;         // Cashback amount in cents
}

export interface CenDroidResponse {
  resultCode: number;
  payload?: {
    UUID?: string;
    PANHash?: string;
    ARC?: string;
    AuthCode?: string;
    Approved?: boolean;
    Amount?: number;
    EcrHostResponse?: string;
    TransactionResultCode?: number;
  };
  extras?: any;
}

export interface CenDroidPaymentDetails {
  cendroid_transaction_uuid?: string;
  cendroid_pan_hash?: string;
  cendroid_auth_code?: string;
  cendroid_arc?: string;
  cendroid_is_approved?: boolean;
  cendroid_amount?: number;
  cendroid_ecr_host_response?: string;
  cendroid_transaction_result_code?: number;
  cendroid_result_code?: number;
  cendroid_response?: CenDroidResponse;
}

export interface CenDroidSettings {
  enabled: boolean;                // Whether CenDroid payment processing is enabled
  testMode?: boolean;              // Test mode flag (for logging/debugging)
  caller: string;                  // Company name for CenDroid invocation (REQUIRED)
  timeout?: number;                // Timeout in seconds for CenDroid response (default: 60)
}

// Split Payment Types
export type PaymentType = "CASH" | "CENDROID" | "ECENTRIC" | "EXTERNAL_POS";

export interface SplitPayment {
  type: PaymentType;
  amount: number;
  notes?: string;
  // ECENTRIC payment fields
  ecentric_transaction_uuid?: string;
  ecentric_auth_code?: string;
  ecentric_result_code?: string;
  ecentric_result_desc?: string;
  ecentric_rrn?: string;
  ecentric_card_type?: string;
  ecentric_masked_pan?: string;
  ecentric_aid?: string;
  ecentric_terminal_id?: string;
  ecentric_pos_entry_mode?: string;
  ecentric_transaction_type?: string;
  ecentric_approval_status?: string;
  ecentric_receipt_number?: string;
  ecentric_receipt_details?: string | object;
  ecentric_latitude?: string;
  ecentric_longitude?: string;
  ecentric_accuracy?: string;
  ecentric_bank_name?: string;
  ecentric_merchant_id?: string;
  ecentric_batch_number?: string;
  // CENDROID payment fields
  cendroid_transaction_uuid?: string;
  cendroid_pan_hash?: string;
  cendroid_auth_code?: string;
  cendroid_arc?: string;
  cendroid_is_approved?: boolean;
  cendroid_amount?: number;
  cendroid_ecr_host_response?: string;
  cendroid_transaction_result_code?: number;
  cendroid_result_code?: number;
  cendroid_response?: CenDroidResponse;
  // EXTERNAL_POS payment fields
  external_pos_receipt_number?: string;
}

export interface CreateSaleRequest extends Partial<EcentricPaymentDetails>, Partial<CenDroidPaymentDetails> {
  // Required fields
  user_id: number;
  staff_id: string | number;
  consumer_id: number;
  region_id: number;
  shift_id: number;
  anonymous: string | boolean;
  international: string | boolean;
  country_id?: number;
  countryId?: number | string;
  productsText: string;
  total: number;
  vat_number: string;
  company_name: string;
  address: string;
  notes: string;
  exchange_notes: string;
  file: any[];
  discount: string;
  // Payment fields - backward compatible
  payment_type?: string; // Optional when using payments array
  external_pos_receipt_number?: string;
  bundleId?: number;
  // Split payment support
  payments?: SplitPayment[]; // Array of payments for split payment
}

export interface CreateCustomerRequest {
  first_name: string;
  last_name?: string;
  phone_no: string;
  email: string;
  region: number;
  date_of_birth?: string;
  customer_type?: CustomerType;
}

export interface CustomerResponse {
  status: string;
  data: {
    consumer_id: number;
    fullname: string;
    email: string | null;
    phone: string | null;
    region_id: number;
    customer_type?: CustomerType;
  };
}

export interface EditCustomerRequest {
  customer_id: number;
  first_name: string;
  last_name?: string;
  phone_no: string;
  email: string;
  region: number;
  date_of_birth?: string;
  customer_type?: CustomerType;
}

export interface SearchCustomerResponse {
  status: string;
  message: string;
  data: Array<{
    consumer_id: number;
    fullname: string;
    surname: string;
    phone: string;
    email: string;
    region_id: number;
    region_name: string;
    dob: string;
    customer_type?: CustomerType;
  }>;
  timestamp: string;
  path: string;
  requestId: string;
}

export interface DialCode {
  dc_id: number;
  phone_code: string;
  country: string;
}

export interface DialCodesResponse {
  status: string;
  results: number;
  data: DialCode[];
  message: string;
  timestamp: string;
  path: string;
  requestId: string;
}

export interface KioskProduct extends UserProduct {
  sku: string;
  product: string;
}

export interface KioskInventory {
  kiosk_id: number;
  kiosk_name: string;
  region_id: number;
  region_name: string;
  products: KioskProduct[];
}

export interface KioskInventoryResponse {
  status: string;
  message: string;
  data: KioskInventory[];
}

// New inventory response: stores with products
export interface StoreWithProducts {
  store_id: number;
  store_name: string;
  total_products?: number;
  products: Array<{
    product_id: number;
    item_name: string;
    category: string;
    qty_on_hand: number;
    sku: string;
    price: number;
    image?: string;
  }>;
}

export interface StoresWithProductsResponse {
  status: string;
  message: string;
  data: {
    stores: StoreWithProducts[];
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  summary?: {
    total_products?: number;
    low_stock_count?: number;
    store_counts?: Array<{ store_id: number; count: number }>;
  };
  timestamp: string;
  path: string;
  requestId: string;
}

// Flattened inventory response for All Products view
export interface InventoryProductWithStore {
  product_id: number;
  item_name: string;
  category: string;
  qty_on_hand: number;
  sku: string;
  price: number;
  image?: string;
  store: {
    store_id: number;
    store_name: string;
  };
}

export interface InventoryProductsResponse {
  status: string;
  message: string;
  data: {
    products: InventoryProductWithStore[];
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  summary?: {
    total_products: number;
    total_value?: number;
    low_stock_count?: number;
  };
  timestamp: string;
  path: string;
  requestId: string;
}

export interface ProductAvailabilityResponse {
  status: string;
  message: string;
  data: {
    stores: Array<{
      store_id: number;
      store_name: string;
      qty_on_hand: number;
    }>;
  };
  timestamp: string;
  path: string;
  requestId: string;
}

// Users Response for staff/user endpoints
export interface UsersResponse {
  status: string;
  data: {
    users: Array<{
      id: number;
      first_name: string;
      last_name: string;
      staff_id: string;
      email?: string;
      phone?: string;
    }>;
  };
  message: string;
  timestamp: string;
  path: string;
  requestId: string;
}

// Product Response for detailed product information
export interface ProductResponse {
  status: string;
  message: string;
  data: {
    product: UserProduct | null;
    productLogs: any[];
  };
  timestamp: string;
  path: string;
  requestId: string;
}

// Sales filter interface
export interface SalesFilters {
  start_date?: string;
  end_date?: string;
  payment_type?: string;
  status?: string;
  region_id?: number;
  consumer_id?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}
