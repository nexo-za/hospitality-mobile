// =============================================================================
// COMMON / ENVELOPE TYPES
// =============================================================================

export interface HospitalityApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data: T;
}

export interface PaginatedResponse<T = unknown> extends HospitalityApiResponse<T[]> {
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface HospitalityErrorResponse {
  status: 'error';
  message: string;
}

// =============================================================================
// FLOOR PLAN TYPES
// =============================================================================

export interface FloorPlan {
  id: number;
  storeId: number;
  name: string;
  description?: string;
  isActive: boolean;
  width?: number;
  height?: number;
  sections?: FloorSection[];
  createdAt: string;
  updatedAt: string;
}

export interface FloorSection {
  id: number;
  floorPlanId: number;
  name: string;
  color?: string;
  displayOrder: number;
  tables?: Table[];
  createdAt: string;
}

// =============================================================================
// TABLE TYPES (TABLES_APP)
// =============================================================================

export type TableStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'BLOCKED'
  | 'DIRTY'
  | 'CLEANING';

export type TableShape = 'SQUARE' | 'ROUND' | 'RECTANGLE' | 'OVAL';

export interface ActiveTableCheck {
  id: number;
  checkNumber?: string;
  grandTotal: number;
  balanceDue: number;
  guestCount: number;
  openedAt: string;
  status?: string;
  serverId?: number;
  serverName?: string;
  itemCount?: number;
}

export interface Table {
  id: number;
  storeId: number;
  sectionId: number;
  name: string;
  tableNumber: string;
  seats: number;
  status: TableStatus;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  shape?: TableShape | string;
  currentCheckId?: number | null;
  currentServerId?: number | null;
  combinationId?: number | null;
  checkOpenedAt?: string | null;
  activeCheck?: ActiveTableCheck | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServerAssignment {
  id: number;
  shiftId: number;
  userId: number;
  sectionId: number;
  storeId: number;
  serverName?: string;
  sectionName?: string;
  assignedAt: string;
}

export interface TableCombination {
  id: number;
  name?: string;
  storeId: number;
  tableIds: number[];
  tables?: Table[];
  createdAt: string;
}

export interface UpdateTableStatusRequest {
  status: TableStatus;
}

export interface AssignServerRequest {
  shiftId: number;
  userId: number;
  sectionId: number;
  storeId: number;
}

export interface CombineTablesRequest {
  tableIds: number[];
  name?: string;
}

// =============================================================================
// MENU TYPES (MENU_APP)
// =============================================================================

export interface Menu {
  id: number;
  storeId: number;
  name: string;
  menuType: string;
  isActive: boolean;
  description?: string;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: number;
  menuId: number;
  categoryId: number;
  categoryName?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  preparationTime?: number;
  allergens?: string[];
  tags?: string[];
  modifierGroups?: ModifierGroup[];
  variants?: MenuItemVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface MenuItemVariant {
  id: number;
  menuItemId: number;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface ModifierGroup {
  id: number;
  name: string;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  modifiers: Modifier[];
}

export interface Modifier {
  id: number;
  groupId: number;
  name: string;
  price: number;
  isAvailable: boolean;
  isDefault: boolean;
}

export interface ToggleItemAvailabilityRequest {
  isAvailable: boolean;
}

// =============================================================================
// ORDER / CHECK TYPES (ORDERS_APP)
// =============================================================================

export type CheckType =
  | 'DINE_IN'
  | 'BAR_TAB'
  | 'TAKEOUT'
  | 'DELIVERY'
  | 'QUICK_SALE';

export type CheckStatus =
  | 'OPEN'
  | 'PRINTED'
  | 'PARTIALLY_PAID'
  | 'CLOSED'
  | 'VOIDED'
  | 'REOPENED'
  | 'TRANSFERRED';

export type CheckItemStatus =
  | 'PENDING'
  | 'FIRED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'VOIDED';

export type CourseType =
  | 'APPETIZER'
  | 'SOUP'
  | 'SALAD'
  | 'ENTREE'
  | 'DESSERT'
  | 'BEVERAGE'
  | 'CUSTOM';

export interface Check {
  id: number;
  storeId: number;
  shiftId?: number;
  tableId?: number;
  tableName?: string;
  combinationId?: number;
  serverId: number;
  serverName?: string;
  revenueCenterId?: number;
  guestProfileId?: number;
  checkNumber: string;
  checkType: CheckType;
  status: CheckStatus;
  guestCount: number;
  notes?: string;
  tabLimit?: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  items: CheckItem[];
  courses?: Course[];
  discounts?: CheckDiscount[];
  serviceCharges?: CheckServiceCharge[];
  openedAt: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckItem {
  id: number;
  checkId: number;
  menuItemId: number;
  menuItemName: string;
  variantId?: number;
  variantName?: string;
  seatNumber?: number;
  courseNumber?: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialRequests?: string;
  status: CheckItemStatus;
  modifiers?: CheckItemModifier[];
  firedAt?: string;
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
}

export interface CheckItemModifier {
  id: number;
  checkItemId: number;
  modifierId: number;
  modifierName: string;
  quantity: number;
  price: number;
}

export interface Course {
  id: number;
  checkId: number;
  courseType: CourseType;
  courseNumber: number;
  name?: string;
  status: 'PENDING' | 'FIRED' | 'COMPLETED';
  firedAt?: string;
  createdAt: string;
}

export interface CreateCheckRequest {
  storeId: number;
  shiftId?: number;
  tableId?: number;
  combinationId?: number;
  revenueCenterId?: number;
  guestProfileId?: number;
  checkType?: CheckType;
  guestCount?: number;
  notes?: string;
  tabLimit?: number;
}

export interface AddCheckItemRequest {
  menuItemId: number;
  variantId?: number;
  seatNumber?: number;
  courseNumber?: number;
  quantity?: number;
  specialRequests?: string;
  modifiers?: Array<{ modifierId: number; quantity: number }>;
}

export interface UpdateCheckItemRequest {
  quantity?: number;
  seatNumber?: number;
  courseNumber?: number;
  specialRequests?: string;
}

export interface VoidCheckItemRequest {
  reasonCode: string;
  reasonText?: string;
}

export interface FireItemsRequest {
  courseNumber?: number;
  itemIds?: number[];
}

export interface AddCourseRequest {
  courseType: CourseType;
  courseNumber: number;
  name?: string;
}

export interface VoidCheckRequest {
  reason: string;
}

export interface TransferCheckRequest {
  transferType: 'TABLE' | 'SERVER' | 'BOTH';
  fromTableId?: number;
  toTableId?: number;
  fromServerId?: number;
  toServerId?: number;
  reason?: string;
}

export type SplitType = 'EVEN' | 'BY_ITEM' | 'BY_SEAT' | 'BY_AMOUNT' | 'CUSTOM';

export interface SplitCheckRequest {
  splitType: SplitType;
  itemIds?: number[];
  amounts?: number[];
}

export interface SplitCheckResult {
  originalCheck: Check;
  newChecks: Check[];
}

// =============================================================================
// BILLING TYPES (BILLING_APP)
// =============================================================================

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type DiscountScope = 'CHECK' | 'ITEM';

export interface CheckDiscount {
  id: number;
  checkId: number;
  checkItemId?: number;
  name: string;
  discountType: DiscountType;
  scope: DiscountScope;
  value: number;
  calculatedAmount: number;
  approvedBy?: number;
  reasonCode?: string;
  createdAt: string;
}

export interface ApplyDiscountRequest {
  checkItemId?: number;
  name: string;
  discountType: DiscountType;
  scope: DiscountScope;
  value: number;
  approvedBy?: number;
  reasonCode?: string;
}

export type ServiceChargeType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface CheckServiceCharge {
  id: number;
  checkId: number;
  name: string;
  chargeType: ServiceChargeType;
  value: number;
  calculatedAmount: number;
  isTaxable: boolean;
  isAutoApplied: boolean;
  createdAt: string;
}

export interface ApplyServiceChargeRequest {
  name: string;
  chargeType: ServiceChargeType;
  value: number;
  isTaxable?: boolean;
  isAutoApplied?: boolean;
}

export interface ReceiptData {
  checkId: number;
  checkNumber: string;
  storeName: string;
  serverName: string;
  tableName?: string;
  guestCount: number;
  items: ReceiptLineItem[];
  subtotal: number;
  discounts: Array<{ name: string; amount: number }>;
  serviceCharges: Array<{ name: string; amount: number }>;
  taxAmount: number;
  totalAmount: number;
  payments: Array<{ type: string; amount: number }>;
  openedAt: string;
  closedAt?: string;
}

export interface ReceiptLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers?: string[];
  specialRequests?: string;
}

// =============================================================================
// PAYMENT TYPES (PAYMENTS_APP)
// =============================================================================

export type HospitalityPaymentType =
  | 'CASH'
  | 'CENDROID'
  | 'ECENTRIC'
  | 'EXTERNAL_POS'
  | 'SNAPSCAN'
  | 'ZAPPER'
  | 'TAP_TO_PAY'
  | 'VOUCHER'
  | 'GIFT_CARD'
  | 'HOUSE_ACCOUNT'
  | 'COMP'
  | 'ROOM_CHARGE'
  | 'MOBILE_MONEY';

export type PaymentStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'VOIDED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'FAILED';

export interface HospitalityPayment {
  id: number;
  checkId: number;
  paymentType: HospitalityPaymentType;
  amount: number;
  tipAmount: number;
  totalAmount: number;
  status: PaymentStatus;
  referenceNumber?: string;
  transactionId?: string;
  processedBy: number;
  processedAt: string;
  voidedAt?: string;
  refundedAt?: string;
  createdAt: string;
}

export interface ProcessPaymentRequest {
  checkId: number;
  paymentType: HospitalityPaymentType;
  amount: number;
  tipAmount?: number;
}

export interface RefundPaymentRequest {
  amount?: number;
}

export interface PaymentSummary {
  totalPayments: number;
  totalAmount: number;
  totalTips: number;
  byPaymentType: Array<{
    paymentType: HospitalityPaymentType;
    count: number;
    amount: number;
    tips: number;
  }>;
}

export interface TipsSummary {
  totalTips: number;
  tipCount: number;
  averageTip: number;
  byServer?: Array<{
    serverId: number;
    serverName: string;
    totalTips: number;
    tipCount: number;
  }>;
}

// =============================================================================
// APPROVAL TYPES (APPROVALS_APP)
// =============================================================================

export type ApprovalRequestType =
  | 'VOID_ITEM'
  | 'VOID_CHECK'
  | 'DISCOUNT'
  | 'REOPEN_CHECK'
  | 'REFUND';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApprovalRequest {
  id: number;
  storeId: number;
  requestType: ApprovalRequestType;
  status: ApprovalStatus;
  requestedBy: number;
  requestedByName?: string;
  approvedBy?: number;
  approvedByName?: string;
  checkId?: number;
  checkItemId?: number;
  payload?: Record<string, unknown>;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalRequest {
  storeId: number;
  requestType: ApprovalRequestType;
  checkId?: number;
  checkItemId?: number;
  payload?: Record<string, unknown>;
}

export interface RejectApprovalRequest {
  reason: string;
}

// =============================================================================
// GUEST TYPES (GUESTS_APP)
// =============================================================================

export interface GuestProfile {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  isVIP: boolean;
  notes?: string;
  tags?: string[];
  consumerId?: number;
  totalVisits?: number;
  totalSpend?: number;
  lastVisitDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGuestRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  isVIP?: boolean;
  notes?: string;
  tags?: string[];
  consumerId?: number;
}

export interface GuestHistoryEntry {
  id: number;
  guestProfileId: number;
  checkId?: number;
  checkNumber?: string;
  totalAmount?: number;
  visitDate: string;
  tableName?: string;
  serverName?: string;
}

// =============================================================================
// RESERVATION & WAITLIST TYPES (RESERVATIONS_WAITLIST_APP)
// =============================================================================

export type ReservationStatus =
  | 'RESERVATION_PENDING'
  | 'CONFIRMED'
  | 'SEATED'
  | 'RESERVATION_COMPLETED'
  | 'NO_SHOW'
  | 'RESERVATION_CANCELLED';

export type ReservationSource =
  | 'PHONE'
  | 'WALK_IN'
  | 'WEBSITE'
  | 'THIRD_PARTY'
  | 'APP'
  | 'INTERNAL';

export interface Reservation {
  id: number;
  storeId: number;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  guestProfileId?: number;
  partySize: number;
  dateTime: string;
  endTime?: string;
  duration?: number;
  status: ReservationStatus;
  source?: ReservationSource;
  notes?: string;
  specialRequests?: string;
  tableIds?: number[];
  tableName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReservationRequest {
  storeId: number;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  partySize: number;
  dateTime: string;
  endTime?: string;
  duration?: number;
  source?: ReservationSource;
  notes?: string;
  specialRequests?: string;
  tableIds?: number[];
  guestProfileId?: number;
}

export interface SeatReservationRequest {
  tableId?: number;
}

export interface CancelReservationRequest {
  reason?: string;
}

export interface ReservationAvailability {
  date: string;
  slots: Array<{
    time: string;
    available: boolean;
    capacity: number;
  }>;
}

export type WaitlistStatus =
  | 'WAITING'
  | 'NOTIFIED'
  | 'SEATED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface WaitlistEntry {
  id: number;
  storeId: number;
  guestName: string;
  guestPhone?: string;
  guestProfileId?: number;
  partySize: number;
  preferredSectionId?: number;
  preferredTableId?: number;
  notes?: string;
  quotedWaitTime?: number;
  actualWaitTime?: number;
  status: WaitlistStatus;
  position?: number;
  createdAt: string;
  seatedAt?: string;
}

export interface AddWaitlistEntryRequest {
  storeId: number;
  guestName: string;
  guestPhone?: string;
  partySize: number;
  preferredSectionId?: number;
  preferredTableId?: number;
  notes?: string;
  quotedWaitTime?: number;
  guestProfileId?: number;
}

export interface EstimatedWait {
  estimatedMinutes: number;
  partiesAhead: number;
}

// =============================================================================
// KDS TYPES (KDS_APP)
// =============================================================================

export interface KDSStation {
  id: number;
  storeId: number;
  name: string;
  stationType: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type KDSTicketStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'READY'
  | 'BUMPED'
  | 'RECALLED';

export interface KDSTicket {
  id: number;
  stationId: number;
  checkId: number;
  checkNumber: string;
  tableName?: string;
  serverName?: string;
  status: KDSTicketStatus;
  priority: number;
  courseNumber?: number;
  items: KDSTicketItem[];
  createdAt: string;
  bumpedAt?: string;
  elapsedSeconds?: number;
}

export interface KDSTicketItem {
  id: number;
  ticketId: number;
  checkItemId: number;
  menuItemName: string;
  quantity: number;
  specialRequests?: string;
  modifiers?: string[];
  status: 'PENDING' | 'IN_PROGRESS' | 'READY';
}

// =============================================================================
// CASH TILL TYPES (CASH_TILL_APP)
// =============================================================================

export interface CashDrawer {
  id: number;
  storeId: number;
  name: string;
  drawerNumber: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDrawerRequest {
  storeId: number;
  name: string;
  drawerNumber: string;
}

export interface UpdateDrawerRequest {
  storeId?: number;
  name?: string;
  drawerNumber?: string;
}

export type CashEventType =
  | 'CASH_DROP'
  | 'PAID_IN'
  | 'PAID_OUT'
  | 'FLOAT_ADJUSTMENT'
  | 'SAFE_DROP';

export interface CashEvent {
  id: number;
  storeId: number;
  shiftId: number;
  cashDrawerId?: number;
  eventType: CashEventType;
  amount: number;
  reason?: string;
  approvedBy?: number;
  createdBy: number;
  createdByName?: string;
  createdAt: string;
}

export interface RecordCashEventRequest {
  storeId: number;
  shiftId: number;
  cashDrawerId?: number;
  eventType: CashEventType;
  amount: number;
  reason?: string;
  approvedBy?: number;
}

export interface ShiftCashSummary {
  shiftId: number;
  openingFloat: number;
  totalCashSales: number;
  totalCashDrops: number;
  totalPaidIn: number;
  totalPaidOut: number;
  totalSafeDrops: number;
  expectedCash: number;
  actualCash?: number;
  variance?: number;
}

export interface BlindCashUp {
  shiftId: number;
  drawerId: number;
  expectedAmount: number;
  denominationBreakdown?: Record<string, number>;
}

// =============================================================================
// SHIFT TYPES (SHIFTS_APP - Updated for Hospitality)
// =============================================================================

export interface HospitalityShift {
  id: number;
  storeId: number;
  userId: number;
  staffId?: string;
  staffName?: string;
  shiftStartDate: string;
  shiftEndDate?: string;
  startingCash?: number;
  endCash?: number;
  status: HospitalityShiftStatus;
  comments?: string;
  organizationId?: number;
  createdAt: string;
  updatedAt: string;
}

export type HospitalityShiftStatus =
  | 'OPEN'
  | 'CLOSED'
  | 'APPROVED'
  | 'PENDING'
  | 'FLAGGED';

export interface OpenShiftRequest {
  user_id: number;
  staff_id?: string;
  staff_name?: string;
  shift_start_date?: string;
  date_time?: string;
  starting_cash?: number;
  comments?: string;
  status?: string;
  organization_id?: number;
}

export interface CloseShiftCompleteRequest {
  user_id: number;
  shift_id: number;
}

export interface CloseShiftCompleteResponse {
  shift: HospitalityShift;
  flagged: boolean;
  flag_reasons: string[];
  auto_approved: boolean;
}

export interface ActiveShiftResponse {
  shift: HospitalityShift | null;
  hasActiveShift: boolean;
}

export interface ActiveShiftSummary {
  shiftId: number;
  salesAmount: number;
  checkRevenue: number;
  totalRevenue: number;
  startedAt: string;
}

// Unified Shift types
export type UnifiedShiftAction = 'START' | 'SUSPEND' | 'RESUME' | 'CLOSE';

export interface UnifiedShiftRequest {
  action: UnifiedShiftAction;
  payload: Record<string, unknown>;
}

export interface UnifiedShift {
  id: number;
  storeId: number;
  status: string;
  startedAt: string;
  closedAt?: string;
  analytics?: Record<string, unknown>;
}

export interface UnifiedShiftAnalytics {
  shiftId: number;
  totalRevenue: number;
  totalChecks: number;
  averageCheckAmount: number;
  coverCount: number;
}

export interface UnifiedShiftAuditEntry {
  id: number;
  shiftId: number;
  action: string;
  performedBy: number;
  performedByName?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface UnifiedShiftVariance {
  id: number;
  shiftId: number;
  category: string;
  expected: number;
  actual: number;
  variance: number;
  notes?: string;
}

// =============================================================================
// REPORTS / DASHBOARD TYPES (REPORTS_DASHBOARD_APP)
// =============================================================================

export interface DailyReport {
  date: string;
  storeId: number;
  storeName?: string;
  totalRevenue: number;
  totalChecks: number;
  averageCheck: number;
  coverCount: number;
  topItems?: Array<{ name: string; quantity: number; revenue: number }>;
}

export interface RevenueReport {
  storeId: number;
  dateFrom: string;
  dateTo: string;
  totalRevenue: number;
  totalTax: number;
  totalDiscounts: number;
  totalServiceCharges: number;
  netRevenue: number;
  byDay?: Array<{ date: string; revenue: number }>;
  byCategory?: Array<{ category: string; revenue: number }>;
}

export interface ServerPerformance {
  serverId: number;
  serverName: string;
  totalChecks: number;
  totalRevenue: number;
  totalTips: number;
  averageCheckAmount: number;
  totalCovers: number;
  revenuePerCover: number;
}

export interface WaiterPerformance {
  serverId: number;
  serverName: string;
  totalChecks: number;
  totalRevenue: number;
  totalTips: number;
  avgCheckAmount: number;
  totalCovers: number;
  subtotal: number;
  totalTax: number;
  revenuePerCover: number;
  shiftId?: number | null;
  hasActiveShift?: boolean;
}

export interface DashboardSummary {
  storeId: number;
  dateFrom: string;
  dateTo: string;
  totalRevenue: number;
  totalChecks: number;
  averageCheck: number;
  coverCount: number;
  topSellingItems?: Array<{ name: string; quantity: number }>;
  revenueByHour?: Array<{ hour: number; revenue: number }>;
}

export interface LiveOperations {
  storeId: number;
  openTables: number;
  totalTables: number;
  activeChecks: number;
  activeServers: number;
  averageTableTime: number;
  waitlistCount: number;
  reservationsPending: number;
  currentRevenue: number;
}

// =============================================================================
// WASTE TYPES
// =============================================================================

export type WasteType = 'SPOILAGE' | 'OVER_PRODUCTION' | 'DAMAGED' | 'EXPIRED' | 'OTHER';

export interface WasteLog {
  id: number;
  storeId: number;
  productId?: number;
  ingredientId?: number;
  itemName: string;
  wasteType: WasteType;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  reason?: string;
  loggedBy: number;
  loggedByName?: string;
  shiftId?: number;
  createdAt: string;
}

export interface WasteSummary {
  totalWasteCost: number;
  totalItems: number;
  byType: Array<{ wasteType: WasteType; count: number; totalCost: number }>;
  dateFrom: string;
  dateTo: string;
}

export interface CreateWasteLogRequest {
  storeId: number;
  productId?: number;
  ingredientId?: number;
  itemName: string;
  wasteType: WasteType;
  quantity: number;
  unit: string;
  costPerUnit: number;
  reason?: string;
  shiftId?: number;
}

// =============================================================================
// INVENTORY COUNT TYPES (Hospitality)
// =============================================================================

export type InventoryCountStatus = 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED';

export interface HospitalityInventoryCount {
  id: number;
  storeId: number;
  status: InventoryCountStatus;
  startedBy: number;
  startedByName?: string;
  completedAt?: string;
  approvedAt?: string;
  approvedBy?: number;
  items: HospitalityInventoryCountItem[];
  createdAt: string;
  updatedAt: string;
}

export interface HospitalityInventoryCountItem {
  id: number;
  countId: number;
  productId?: number;
  ingredientId?: number;
  itemName: string;
  unit: string;
  expectedQuantity: number;
  countedQuantity?: number;
  variance?: number;
  notes?: string;
}

export interface CreateInventoryCountRequest {
  storeId: number;
}

// =============================================================================
// SHIFT MANAGEMENT TYPES (consolidated re-exports from api/types/shift.ts)
// =============================================================================

export type {
  BaseApiResponse,
  SuccessResponse,
  ErrorResponse,
  ShiftData,
  ActiveShift,
  CanStartShiftRequest,
  OpenShiftRequest as ShiftOpenRequest,
  CloseShiftRequest,
  GetActiveShiftRequest,
  GetShiftRequest,
  CanStartShiftResponse,
  OpenShiftResponse,
  CloseShiftResponse,
  GetActiveShiftResponse,
  GetShiftResponse,
  ProductCount,
  InventoryCountRequest,
  InventoryVariance,
  InventoryCountResponse,
  StoreProduct,
  GetInventoryRequest,
  GetSalesByShiftRequest,
  GetInventoryResponse,
  SaleItem,
  ShiftSale,
  SalesSummary,
  GetSalesByShiftResponse,
  ShiftValidationError,
  CashContinuityError,
  InventoryVarianceError,
  ShiftApiError,
  ShiftStatus,
  ShiftWorkflow,
} from "../api/types/shift";

export {
  SHIFT_STATUS,
  ERROR_CODES,
  VARIANCE_TYPES,
} from "../api/types/shift";
