import { getApiConfig } from "../../config/appConfig";

// Function to get the current base URL (always static)
export const getBaseUrl = () => {
  try {
    return getApiConfig().url || "https://backend.nexo.app/api/";
  } catch (error) {
    console.warn("[API Types] Failed to get config, using fallback URL");
    return "https://backend.nexo.app/api/";
  }
};

// Base API URL - This is now static and won't change after login
export const BASE_URL = getBaseUrl();

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication & User Management
  LOGIN: "login_user",
  FORGOT_PASSWORD: "forgot_password",
  GET_USER: "users",
  VALIDATE_STAFF: "validate_staff_id?staff_id=",
  VERIFY_PIN: "verify_pin",
  UPDATE_PIN: "update_pin",

  // Shift Management
  OPEN_SHIFT: "open_shift",
  CLOSE_SHIFT: "close_shift",
  GET_USER_SHIFTS: "get_user_shifts?user_id=",
  GET_SHIFT_SUMMARY: "get_shift_by_store_id?store_id=",
  UPDATE_SHIFT: "update_shift",
  GET_SHIFT: "get_shift",

  // Inventory Management
  GET_USER_INVENTORY: "get_user_inventory?user_id=",
  OPEN_INVENTORY: "open_inventory",
  CLOSE_INVENTORY: "close_inventory",
  GET_STORE_INVENTORY: "get_inventory",

  // Customer Management
  GET_CUSTOMERS: "get_customers",
  EDIT_CUSTOMER: "edit_customer",
  SEARCH_CUSTOMER: "search_customer?search=",
  CREATE_CUSTOMER: "create_customer",
  GET_CUSTOMER_SALES: "get_sales?consumer_id=",

  // Sales Management
  GET_SALES: "get_sales?user_id=",
  GET_SALE_DETAILS: "get_sales_details?sales_id=",
  CREATE_SALE: "create_sale",
  SEND_RECEIPT: "send_receipt",
  REFUND_SALE: "refund_sale",
  GET_TRANSACTION_DETAILS: "transaction/:transactionUuid",

  // Bundle & Product Management
  GET_USER_BUNDLES: "get_user_bundles?user_id=",
  GET_DIAL_CODES: "get_dial_codes",

  // Store Management
  GET_STORE_STAFF: "get_staff_by_store?store_id=",
  GET_REGIONS: "get_regions",
  GET_STAFF: "get_staff",

  // Account & Voucher Management
  GET_ACCOUNT_DETAILS: "get_account_details?user_id=",
  VALIDATE_VOUCHER: "validate_voucher?token=",
};

// Base API Response Interface
export interface IApiResponse<T> {
  isSuccess: boolean;
  errors?: Error;
  data?: T;
}

export interface Error {
  timestamp: number;
  key: string;
  message: string;
}

// Authentication Types
export interface SignInResponse {
  message: string;
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  staff_id: string;
  store: string;
  region_id: number;
  region_name: string;
  role: string;
  active: number;
}

export interface SignInApiResponse {
  data: SignInResponse;
  message: string;
  path: string;
  requestId: string;
  status: string;
  timestamp: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ValidateStaffIdResponse {
  data: {
    message: string;
    name: string;
  };
}

// Request Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface VerifyPinRequest {
  user_id: string;
  pin: string;
}

// Shift Types
export interface OpenShiftApiResponse {
  message: string;
  shift_id: number;
}

export interface OpenShiftRequest {
  user_id: number;
  staff_id: string;
  shift_id: number;
  date_time: string;
  starting_cash: number;
  comments?: string;
}

export interface CloseShiftRequest {
  // The backend returns shift_id as string but wants it sent back exactly as received
  shift_id: number | string;
  user_id: number;
  shift_close_date: string;
  payouts: number;
  closing_cash: number;
  flag_cash: boolean;
  comments?: string;
}

export interface UserShiftResponse {
  data: {
    message: string;
    data: UserShift[];
  };
}

export interface UserShift {
  shift_id: number;
  id?: number;
  staff_id: string;
  start_time: string;
  starting_cash: number;
  status: number | string;

  // New fields from API response
  userId?: number;
  staffName?: string;
  shiftStartDate?: string;
  shiftEndDate?: string | null;
  startingCash?: number;
  endCash?: number | null;
  payouts?: number | null;
  flagCash?: boolean | null;
  comments?: string | null;
  user?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    staffId: string;
    contactNumber: string;
    store: string;
    regionId: number;
    role: string;
  };
}

export interface ShiftSummaryResponse {
  data: {
    status: string;
    data: ShiftSummary[];
  };
}

export interface ShiftSummary {
  shift_id: number;
  user_id: number;
  open_time: string;
  close_time: string;
  status: string;
  total_sales: number;
  total_customers: number;
}

export interface UpdateShiftRequest {
  shiftId: number;
  storeId: number;
  staffId: string;
  paidIn?: number;
  deposited?: number;
  actualCash?: number;
}

// Inventory Types
export interface InventoryData {
  items: InventoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InventoryItem {
  product_id: number;
  item_name: string;
  category: string;
  qty_on_hand: number;
  image: string;
  price: number;
  updated_at: string;
  kiosk: string;
}

export interface StoreInventoryResponse {
  data: {
    status: string;
    results: number;
    data: StoreDetails[];
  };
}

export interface StoreDetails {
  store_id: number;
  store_name: string;
  inventory: InventoryItem[];
}

export interface OpenInventoryRequest {
  // The backend returns shift_id as string but wants it sent back exactly as received
  userId: number;
  shiftId: number | string;
  products: {
    product_id: number; // Should be a number
    qty: number;
  }[];
  comments?: string;
}

export interface CloseInventoryRequest {
  // The backend returns shift_id as string but wants it sent back exactly as received
  userId: number;
  shiftId: number | string;
  products: {
    product_id: number; // Should be a number
    qty: number;
  }[];
  comments?: string;
}

// Customer Types
export interface CustomerResponse {
  data: {
    message: string;
    data: CustomerDetailsResponse[];
  };
}

export interface CustomerDetailsResponse {
  consumer_id: number;
  fullname: string;
  surname: string;
  phone: string;
  email: string;
  region_id: number;
  region_name: string;
  dob: string;
}

export interface SearchCustomerResponse {
  data: {
    status: string;
    data: CustomerDetailsResponse[];
  };
}

export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  phoneNo: string;
  email: string;
  region: number;
  dateOfBirth?: string;
}

export interface EditCustomerRequest {
  customerId: number;
  firstName: string;
  lastName: string;
  phoneNo: string;
  email: string;
  region: number;
  dateOfBirth?: string;
}

// Sales Types
export interface SaleDetailResponse {
  data: {
    message: string;
    data: SaleDetails[];
  };
}

export interface SaleDetails {
  sales_id: number;
  user_id: number;
  consumer_id: number;
  total_amount: number;
  payment_type: string;
  created_at: string;
  status: string;
  items: SaleItem[];
}

export interface SaleItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CreateSaleRequest {
  userId: number;
  storeId: number;
  customerId: number;
  items: Array<{
    productId: number;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  paymentMethod: string;
  notes?: string;
}

export interface RefundSaleRequest {
  saleId: number;
  userId: number;
  reason: string;
}

// Bundle Types
export interface BundleItemResponse {
  data: {
    message: string;
    data: BundleItem[];
  };
}

export interface BundleItem {
  bundle_id: number;
  bundle_name: string;
  products: BundleProduct[];
}

export interface BundleProduct {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

// Store Types
export interface StoreStaffResponse {
  data: {
    message: string;
    data: StoreStaff[];
  };
}

export interface StoreStaff {
  staff_id: string;
  name: string;
  role: string;
  status?: string;
  // Extended fields returned by get_staff_by_store
  email?: string;
  phone?: string;
  userId?: number;
  username?: string;
  storeId?: number;
  storeName?: string;
  active?: boolean;
  firstName?: string;
  lastName?: string;
}

export interface RegionDataResponse {
  data: {
    message: string;
    data: RegionData[];
  };
}

export interface RegionData {
  region_id: number;
  region_name: string;
}

// Account Types
export interface AccountInfoResponse {
  data: {
    message: string;
    user_id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    contact_number: string;
    staff_id: string;
    store: string;
    region_id: number;
    region_name: string;
    role: string;
    active: number;
  };
  message: string;
  path: string;
  requestId: string;
  status: string;
  timestamp: string;
}

export interface AccountInfo {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  staff_id: string;
  store: string;
  region_id: number;
  region_name: string;
  role: string;
  active: number;
  store_id?: number;
  store_name?: string;
}

// Voucher Types
export interface ValidateVoucherResponse {
  data: {
    message: string;
    data: VoucherData;
  };
}

export interface VoucherData {
  voucher_id: number;
  amount: number;
  status: string;
  expiry_date: string;
}

// Response Types
export interface ShiftResponse {
  id: number;
  userId: number;
  storeId: number;
  openingBalance: number;
  closingBalance?: number;
  openingTime: string;
  closingTime?: string;
  status: "open" | "closed";
  notes?: string;
}

export interface SaleResponse {
  id: number;
  userId: number;
  storeId: number;
  customerId: number;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  notes?: string;
}

export interface BundleResponse {
  id: number;
  name: string;
  description?: string;
  price: number;
  items: Array<{
    productId: number;
    quantity: number;
    price: number;
  }>;
}

export interface StoreStaffResponse {
  id: number;
  name: string;
  role: string;
  email: string;
  phone?: string;
}

export interface RegionResponse {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export interface ValidateVoucherResponse {
  isValid: boolean;
  amount: number;
  expiryDate: string;
  message: string;
}
