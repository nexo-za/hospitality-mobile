import type { ImpactFeedbackStyle } from "expo-haptics";

// =============================================================================
// PRIORITY
// =============================================================================

export enum NotificationPriority {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

// =============================================================================
// NOTIFICATION TYPES (one per meaningful event category)
// =============================================================================

export enum NotificationType {
  ORDER_READY = "ORDER_READY",
  APPROVAL_REQUEST = "APPROVAL_REQUEST",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  CHECK_VOIDED = "CHECK_VOIDED",
  CHECK_OPENED = "CHECK_OPENED",
  CHECK_CLOSED = "CHECK_CLOSED",
  ITEMS_FIRED = "ITEMS_FIRED",
  TABLE_UPDATE = "TABLE_UPDATE",
  ITEM_ADDED = "ITEM_ADDED",
  KDS_UPDATE = "KDS_UPDATE",
}

// =============================================================================
// CORE NOTIFICATION INTERFACE
// =============================================================================

export interface AppNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  /** Arbitrary event payload for navigation / context */
  data: Record<string, unknown>;
  read: boolean;
  createdAt: number;
  /** Epoch ms after which the notification can be pruned */
  expiresAt?: number;
  /** How many events have been merged into this single notification entry */
  coalesceCount?: number;
}

// =============================================================================
// PRIORITY BEHAVIOUR CONFIG
// =============================================================================

export interface PriorityConfig {
  /** Duration the toast stays visible in ms. 0 = persistent until dismissed. */
  toastDurationMs: number;
  hapticStyle: ImpactFeedbackStyle | null;
  /** Whether this priority tier is eligible for push notifications */
  pushEnabled: boolean;
}

export const PRIORITY_CONFIG: Record<NotificationPriority, PriorityConfig> = {
  [NotificationPriority.CRITICAL]: {
    toastDurationMs: 0,
    hapticStyle: "heavy" as ImpactFeedbackStyle,
    pushEnabled: true,
  },
  [NotificationPriority.HIGH]: {
    toastDurationMs: 5000,
    hapticStyle: "medium" as ImpactFeedbackStyle,
    pushEnabled: true,
  },
  [NotificationPriority.MEDIUM]: {
    toastDurationMs: 3000,
    hapticStyle: "light" as ImpactFeedbackStyle,
    pushEnabled: false,
  },
  [NotificationPriority.LOW]: {
    toastDurationMs: 0,
    hapticStyle: null,
    pushEnabled: false,
  },
};

// =============================================================================
// SOCKET EVENT → NOTIFICATION TYPE + PRIORITY MAPPING
// =============================================================================

export interface EventMapping {
  type: NotificationType;
  priority: NotificationPriority;
  title: (payload: Record<string, any>) => string;
  body: (payload: Record<string, any>) => string;
}

export const SOCKET_EVENT_MAP: Record<string, EventMapping> = {
  "kds:ticketReady": {
    type: NotificationType.ORDER_READY,
    priority: NotificationPriority.CRITICAL,
    title: () => "Order Ready",
    body: (p) =>
      p.checkNumber
        ? `Check #${p.checkNumber} is ready for pickup`
        : "An order is ready for pickup",
  },
  "kds:ticketBumped": {
    type: NotificationType.ORDER_READY,
    priority: NotificationPriority.CRITICAL,
    title: () => "Order Bumped",
    body: (p) =>
      p.checkNumber
        ? `Check #${p.checkNumber} has been bumped — ready to serve`
        : "An order has been bumped",
  },
  "approval:request": {
    type: NotificationType.APPROVAL_REQUEST,
    priority: NotificationPriority.CRITICAL,
    title: () => "Approval Needed",
    body: (p) =>
      p.requestType
        ? `A ${(p.requestType as string).replace(/_/g, " ").toLowerCase()} request needs your approval`
        : "An approval request is waiting",
  },
  "payment:failed": {
    type: NotificationType.PAYMENT_FAILED,
    priority: NotificationPriority.CRITICAL,
    title: () => "Payment Failed",
    body: (p) =>
      p.checkNumber
        ? `Payment failed on check #${p.checkNumber}`
        : "A payment has failed",
  },
  "check:voided": {
    type: NotificationType.CHECK_VOIDED,
    priority: NotificationPriority.HIGH,
    title: () => "Check Voided",
    body: (p) =>
      p.checkNumber
        ? `Check #${p.checkNumber} was voided${p.reason ? `: ${p.reason}` : ""}`
        : "A check was voided",
  },
  "check:opened": {
    type: NotificationType.CHECK_OPENED,
    priority: NotificationPriority.HIGH,
    title: () => "New Check",
    body: (p) => {
      const parts: string[] = [];
      if (p.checkNumber) parts.push(`#${p.checkNumber}`);
      if (p.tableLabel) parts.push(`at ${p.tableLabel}`);
      if (p.guestCount) parts.push(`(${p.guestCount} guests)`);
      return parts.length
        ? `Check ${parts.join(" ")}`
        : "A new check was opened";
    },
  },
  "check:closed": {
    type: NotificationType.CHECK_CLOSED,
    priority: NotificationPriority.HIGH,
    title: () => "Check Closed",
    body: (p) =>
      p.checkNumber
        ? `Check #${p.checkNumber} has been closed`
        : "A check has been closed",
  },
  "check:itemFired": {
    type: NotificationType.ITEMS_FIRED,
    priority: NotificationPriority.MEDIUM,
    title: () => "Items Fired",
    body: (p) => {
      const names = (p.itemNames as string[] | undefined) ?? [];
      if (names.length && p.checkNumber)
        return `${names.join(", ")} fired on check #${p.checkNumber}`;
      if (p.checkNumber) return `Items fired on check #${p.checkNumber}`;
      return "Items have been fired to the kitchen";
    },
  },
  "table:update": {
    type: NotificationType.TABLE_UPDATE,
    priority: NotificationPriority.MEDIUM,
    title: () => "Table Update",
    body: (p) =>
      p.tableName
        ? `Table ${p.tableName} is now ${(p.status as string)?.toLowerCase() ?? "updated"}`
        : "A table status has changed",
  },
  "check:itemAdded": {
    type: NotificationType.ITEM_ADDED,
    priority: NotificationPriority.LOW,
    title: () => "Item Added",
    body: (p) =>
      p.menuItemName
        ? `${p.menuItemName} added to check${p.checkNumber ? ` #${p.checkNumber}` : ""}`
        : "An item was added to a check",
  },
  "check:itemVoided": {
    type: NotificationType.CHECK_VOIDED,
    priority: NotificationPriority.MEDIUM,
    title: () => "Item Voided",
    body: (p) =>
      p.menuItemName
        ? `${p.menuItemName} voided${p.checkNumber ? ` on check #${p.checkNumber}` : ""}`
        : "An item was voided",
  },
  "kds:ticketUpdated": {
    type: NotificationType.KDS_UPDATE,
    priority: NotificationPriority.LOW,
    title: () => "KDS Update",
    body: () => "A KDS ticket was updated",
  },
  "check:update": {
    type: NotificationType.CHECK_OPENED,
    priority: NotificationPriority.LOW,
    title: () => "Check Updated",
    body: (p) =>
      p.checkNumber
        ? `Check #${p.checkNumber} was updated`
        : "A check was updated",
  },
};

// =============================================================================
// ICON MAPPING (MaterialCommunityIcons names)
// =============================================================================

export const NOTIFICATION_ICON: Record<NotificationType, string> = {
  [NotificationType.ORDER_READY]: "food",
  [NotificationType.APPROVAL_REQUEST]: "shield-check-outline",
  [NotificationType.PAYMENT_FAILED]: "credit-card-off-outline",
  [NotificationType.CHECK_VOIDED]: "close-circle-outline",
  [NotificationType.CHECK_OPENED]: "receipt",
  [NotificationType.CHECK_CLOSED]: "check-circle-outline",
  [NotificationType.ITEMS_FIRED]: "fire",
  [NotificationType.TABLE_UPDATE]: "table-furniture",
  [NotificationType.ITEM_ADDED]: "cart-plus",
  [NotificationType.KDS_UPDATE]: "monitor-dashboard",
};

// =============================================================================
// FILTER CATEGORIES
// =============================================================================

export type NotificationFilter = "all" | "action" | "kitchen" | "orders";

export const NOTIFICATION_FILTERS: {
  key: NotificationFilter;
  label: string;
  icon: string;
}[] = [
  { key: "all", label: "All", icon: "bell-outline" },
  { key: "action", label: "Action", icon: "alert-circle-outline" },
  { key: "kitchen", label: "Kitchen", icon: "chef-hat" },
  { key: "orders", label: "Orders", icon: "receipt" },
];

const FILTER_TYPES: Record<NotificationFilter, NotificationType[] | null> = {
  all: null,
  action: [
    NotificationType.ORDER_READY,
    NotificationType.APPROVAL_REQUEST,
    NotificationType.PAYMENT_FAILED,
  ],
  kitchen: [
    NotificationType.ORDER_READY,
    NotificationType.ITEMS_FIRED,
    NotificationType.KDS_UPDATE,
  ],
  orders: [
    NotificationType.CHECK_OPENED,
    NotificationType.CHECK_CLOSED,
    NotificationType.CHECK_VOIDED,
    NotificationType.ITEM_ADDED,
  ],
};

export function filterNotifications(
  notifications: ReadonlyArray<AppNotification>,
  filter: NotificationFilter,
): AppNotification[] {
  const types = FILTER_TYPES[filter];
  const list = types
    ? notifications.filter((n) => types.includes(n.type))
    : [...notifications];
  // Always hide LOW in the default "all" view -- they're still stored for auditing
  if (filter === "all") {
    return list.filter((n) => n.priority !== NotificationPriority.LOW);
  }
  return list;
}

// =============================================================================
// NAVIGATION TARGETS
// =============================================================================

export function getNavigationTarget(
  notification: AppNotification,
): { screen: string; params?: Record<string, unknown> } | null {
  const { type, data } = notification;

  switch (type) {
    case NotificationType.ORDER_READY:
    case NotificationType.ITEMS_FIRED:
    case NotificationType.ITEM_ADDED:
    case NotificationType.CHECK_CLOSED:
    case NotificationType.CHECK_VOIDED:
    case NotificationType.PAYMENT_FAILED:
    case NotificationType.CHECK_OPENED:
      if (data.checkId) return { screen: `/order/${data.checkId}` };
      return null;

    case NotificationType.APPROVAL_REQUEST:
      return { screen: "/more/approvals" };

    case NotificationType.TABLE_UPDATE:
      return { screen: "/(tabs)/tables" };

    case NotificationType.KDS_UPDATE:
      return { screen: "/more/kds" };

    default:
      return null;
  }
}
