/**
 * Hospitality API endpoint constants.
 * These map to the module base paths defined in the backend.
 */

export const HOSPITALITY_ENDPOINTS = {
  // AUTH_APP
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    VALIDATE: '/auth/validate',
    PROFILE: '/auth/profile',
    LOGOUT: '/auth/logout',
    SESSIONS: '/auth/sessions',
  },

  // SHIFTS_APP
  SHIFTS: {
    ACTIVE: '/shifts/active',
    ACTIVE_SUMMARY: '/shifts/active/summary',
    USER: (userId: number) => `/shifts/user/${userId}`,
    STORE: (storeId: number) => `/shifts/store/${storeId}`,
    SALES: (shiftId: number) => `/shifts/sales/${shiftId}`,
    GET_SHIFT: '/shifts/get_shift',
    GET: (id: number) => `/shifts/${id}`,
    OPEN: '/shifts/open',
    CLOSE: (id: number) => `/shifts/close/${id}`,
    CLOSE_COMPLETE: '/shifts/close-complete',
    INVENTORY: '/shifts/inventory',
    APPROVE: (id: number) => `/shifts/${id}/approve`,
    FLAG: (id: number) => `/shifts/${id}/flag`,
    ATTACHMENTS: (id: number) => `/shifts/${id}/attachments`,
  },

  // UNIFIED_SHIFTS_APP
  UNIFIED_SHIFTS: {
    BASE: '/unified-shifts',
    GET: (id: number) => `/unified-shifts/${id}`,
    ANALYTICS: (id: number) => `/unified-shifts/${id}/analytics`,
    AUDIT: (id: number) => `/unified-shifts/${id}/audit-trail`,
    VARIANCES: (id: number) => `/unified-shifts/${id}/variances`,
  },

  // TABLES_APP
  TABLES: {
    LIST: '/hospitality/floor-plans/tables',
    GET: (id: number) => `/hospitality/floor-plans/tables/${id}`,
    STATUS: (id: number) => `/hospitality/floor-plans/tables/${id}/status`,
    SERVER_ASSIGNMENTS: '/hospitality/floor-plans/server-assignments',
    COMBINATIONS: '/hospitality/floor-plans/combinations',
  },

  // MENU_APP
  MENU: {
    LIST: '/hospitality/menus',
    DETAIL: (id: number) => `/hospitality/menus/${id}`,
    CATEGORIES: (menuId: number) => `/hospitality/menus/${menuId}/categories`,
    SCHEDULES: (menuId: number) => `/hospitality/menus/${menuId}/schedules`,
    ITEMS: '/hospitality/menus/items',
    ITEM: (id: number) => `/hospitality/menus/items/${id}`,
    AVAILABILITY: (id: number) => `/hospitality/menus/items/${id}/availability`,
    MODIFIER_GROUPS: '/hospitality/menus/modifier-groups',
  },

  // ORDERS_APP (Checks)
  CHECKS: {
    BASE: '/hospitality/checks',
    GET: (id: number) => `/hospitality/checks/${id}`,
    ITEMS: (checkId: number) => `/hospitality/checks/${checkId}/items`,
    ITEM: (itemId: number) => `/hospitality/checks/items/${itemId}`,
    VOID_ITEM: (itemId: number) => `/hospitality/checks/items/${itemId}/void`,
    FIRE: (checkId: number) => `/hospitality/checks/${checkId}/fire`,
    COURSES: (checkId: number) => `/hospitality/checks/${checkId}/courses`,
    FIRE_COURSE: (courseId: number) => `/hospitality/checks/courses/${courseId}/fire`,
    CLOSE: (id: number) => `/hospitality/checks/${id}/close`,
    VOID: (id: number) => `/hospitality/checks/${id}/void`,
    REOPEN: (id: number) => `/hospitality/checks/${id}/reopen`,
    TRANSFER: (id: number) => `/hospitality/checks/${id}/transfer`,
    SPLIT: (id: number) => `/hospitality/checks/${id}/split`,
  },

  // BILLING_APP
  BILLING: {
    DISCOUNTS: (checkId: number) => `/hospitality/checks/${checkId}/discounts`,
    REMOVE_DISCOUNT: (discountId: number) => `/hospitality/checks/discounts/${discountId}`,
    SERVICE_CHARGES: (checkId: number) => `/hospitality/checks/${checkId}/service-charges`,
    REMOVE_CHARGE: (chargeId: number) => `/hospitality/checks/service-charges/${chargeId}`,
    RECEIPT: (checkId: number) => `/hospitality/checks/${checkId}/receipt`,
  },

  // PAYMENTS_APP
  PAYMENTS: {
    BASE: '/hospitality/payments',
    CHECK: (checkId: number) => `/hospitality/payments/check/${checkId}`,
    VOID: (id: number) => `/hospitality/payments/${id}/void`,
    REFUND: (id: number) => `/hospitality/payments/${id}/refund`,
    SUMMARY: '/hospitality/payments/summary',
    TIPS: '/hospitality/payments/tips',
  },

  // APPROVALS_APP
  APPROVALS: {
    BASE: '/hospitality/approvals',
    GET: (id: number) => `/hospitality/approvals/${id}`,
    APPROVE: (id: number) => `/hospitality/approvals/${id}/approve`,
    REJECT: (id: number) => `/hospitality/approvals/${id}/reject`,
  },

  // GUESTS_APP
  GUESTS: {
    BASE: '/hospitality/guests',
    GET: (id: number) => `/hospitality/guests/${id}`,
    HISTORY: (id: number) => `/hospitality/guests/${id}/history`,
  },

  // RESERVATIONS_WAITLIST_APP
  RESERVATIONS: {
    BASE: '/hospitality/reservations',
    TODAY: '/hospitality/reservations/today',
    UPCOMING: '/hospitality/reservations/upcoming',
    AVAILABILITY: '/hospitality/reservations/availability',
    CONFIRM: (id: number) => `/hospitality/reservations/${id}/confirm`,
    SEAT: (id: number) => `/hospitality/reservations/${id}/seat`,
    COMPLETE: (id: number) => `/hospitality/reservations/${id}/complete`,
    CANCEL: (id: number) => `/hospitality/reservations/${id}/cancel`,
    NO_SHOW: (id: number) => `/hospitality/reservations/${id}/no-show`,
  },
  WAITLIST: {
    BASE: '/hospitality/waitlist',
    ESTIMATED_WAIT: '/hospitality/waitlist/estimated-wait',
  },

  // KDS_APP
  KDS: {
    STATIONS: '/hospitality/kds/stations',
    TICKETS: (stationId: number) => `/hospitality/kds/stations/${stationId}/tickets`,
    BUMP: (id: number) => `/hospitality/kds/tickets/${id}/bump`,
  },

  // CASH_TILL_APP
  CASH: {
    DRAWERS: '/hospitality/cash/drawers',
    DRAWER: (id: number) => `/hospitality/cash/drawers/${id}`,
    EVENTS: '/hospitality/cash/events',
    SHIFT_SUMMARY: (shiftId: number) => `/hospitality/cash/shift-summary/${shiftId}`,
    BLIND_CASH_UP: (shiftId: number, drawerId: number) =>
      `/hospitality/cash/blind-cash-up/${shiftId}/${drawerId}`,
  },

  // REPORTS_DASHBOARD_APP
  REPORTS: {
    DAILY: '/hospitality/reports/daily',
    REVENUE: '/hospitality/reports/revenue',
    SERVER_PERFORMANCE: '/hospitality/reports/server-performance',
    WAITER_PERFORMANCE: '/hospitality/reports/waiter-performance',
    WAITER_CURRENT_SHIFT: '/hospitality/reports/waiter-performance/current-shift',
  },
  DASHBOARD: {
    SUMMARY: '/hospitality/dashboard/summary',
    LIVE_OPERATIONS: '/hospitality/dashboard/live-operations',
    REVENUE_TRENDS: '/hospitality/dashboard/revenue-trends',
    TOP_ITEMS: '/hospitality/dashboard/top-items',
    RECENT_CHECKS: '/hospitality/dashboard/recent-checks',
    ANALYTICS: '/hospitality/dashboard/analytics',
    INVENTORY_ALERTS: '/hospitality/dashboard/inventory-alerts',
    STAFF_PERFORMANCE: '/hospitality/dashboard/staff-performance',
  },

  // INVENTORY_APP
  INVENTORY: {
    BASE: '/inventory',
    ITEMS: '/inventory/items',
    LOTS: '/inventory/lots',
    PRODUCT_LOTS: (productId: number) => `/inventory/items/${productId}/lots`,
    STORES_WITH_PRODUCTS: '/inventory/stores-with-products',
    PRODUCTS: '/inventory/products',
    PRODUCT_AVAILABILITY: '/inventory/product-availability',
    LOW_STOCK: '/inventory/low-stock',
    STATS: '/inventory/stats',
    USER: (userId: number) => `/inventory/user/${userId}`,
    STORE: (storeId: number) => `/inventory/store/${storeId}`,
    OPEN: '/inventory/open_inventory',
    CLOSE: '/inventory/close',
  },

  // SALES (native router)
  SALES_BY_SHIFT: '/sales_by_shift',

  WASTE: {
    BASE: '/hospitality/waste',
    GET: (id: number) => `/hospitality/waste/${id}`,
    SUMMARY: '/hospitality/waste/summary',
  },

  INVENTORY_COUNTS: {
    BASE: '/hospitality/inventory-counts',
    GET: (id: number) => `/hospitality/inventory-counts/${id}`,
    ITEM: (id: number) => `/hospitality/inventory-counts/items/${id}`,
    COMPLETE: (id: number) => `/hospitality/inventory-counts/${id}/complete`,
    APPROVE_COUNT: (id: number) => `/hospitality/inventory-counts/${id}/approve`,
  },
} as const;
