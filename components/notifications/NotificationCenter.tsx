import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  type AppNotification,
  type NotificationFilter,
  NotificationPriority,
  NOTIFICATION_ICON,
  NOTIFICATION_FILTERS,
  filterNotifications,
  getNavigationTarget,
} from '@/types/notifications';

const PRIORITY_COLOR: Record<NotificationPriority, string> = {
  [NotificationPriority.CRITICAL]: '#DC2626',
  [NotificationPriority.HIGH]: '#EA580C',
  [NotificationPriority.MEDIUM]: '#2563EB',
  [NotificationPriority.LOW]: '#9CA3AF',
};

const PRIORITY_BG: Record<NotificationPriority, string> = {
  [NotificationPriority.CRITICAL]: '#FEF2F2',
  [NotificationPriority.HIGH]: '#FFF7ED',
  [NotificationPriority.MEDIUM]: '#EFF6FF',
  [NotificationPriority.LOW]: '#F9FAFB',
};

// ─── Bell icon with badge ────────────────────────────────────────────────────

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        hitSlop={8}
        style={tw`relative p-1`}
      >
        <MaterialCommunityIcons name="bell-outline" size={24} color="#374151" />
        {unreadCount > 0 && (
          <View
            style={[
              tw`absolute -top-0.5 -right-0.5 rounded-full items-center justify-center`,
              {
                backgroundColor: '#DC2626',
                minWidth: 18,
                height: 18,
                paddingHorizontal: 4,
              },
            ]}
          >
            <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Geist-SemiBold' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <NotificationModal visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

// ─── Full-screen notification modal ──────────────────────────────────────────

function NotificationModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { notifications, markRead, markAllRead, clearAll, dismiss } =
    useNotifications();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');

  const filtered = useMemo(
    () => filterNotifications(notifications, activeFilter),
    [notifications, activeFilter],
  );
  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const handlePress = useCallback(
    (notification: AppNotification) => {
      markRead(notification.id);
      const target = getNavigationTarget(notification);
      onClose();
      if (target) {
        router.push(target.screen as any);
      }
    },
    [markRead, onClose, router],
  );

  const unreadInFilter = filtered.filter((n) => !n.read).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 bg-gray-50`}>
        {/* Header */}
        <View style={tw`bg-white border-b border-gray-100`}>
          <View style={tw`flex-row items-center justify-between px-4 pt-4 pb-2`}>
            <View style={tw`flex-row items-center`}>
              <Text style={[tw`text-gray-900`, typography.h3]}>Notifications</Text>
              {unreadInFilter > 0 && (
                <View style={tw`ml-2 bg-blue-600 rounded-full px-2 py-0.5`}>
                  <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'Geist-SemiBold' }}>
                    {unreadInFilter}
                  </Text>
                </View>
              )}
            </View>
            <View style={tw`flex-row items-center gap-3`}>
              {notifications.length > 0 && (
                <>
                  <TouchableOpacity onPress={markAllRead}>
                    <Text style={[tw`text-blue-600`, typography.caption]}>
                      Mark all read
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={clearAll}>
                    <Text style={[tw`text-gray-400`, typography.caption]}>
                      Clear all
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`px-4 pb-3 gap-2`}
          >
            {NOTIFICATION_FILTERS.map((f) => {
              const isActive = activeFilter === f.key;
              const count = f.key === 'all'
                ? notifications.filter((n) => n.priority !== NotificationPriority.LOW && !n.read).length
                : filterNotifications(notifications, f.key).filter((n) => !n.read).length;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setActiveFilter(f.key)}
                  style={[
                    tw`flex-row items-center px-3.5 py-2 rounded-full border`,
                    isActive
                      ? tw`bg-blue-600 border-blue-600`
                      : tw`bg-white border-gray-200`,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={f.icon as any}
                    size={15}
                    color={isActive ? '#fff' : '#6B7280'}
                  />
                  <Text
                    style={[
                      tw`ml-1.5 text-xs font-semibold`,
                      { color: isActive ? '#fff' : '#374151' },
                    ]}
                  >
                    {f.label}
                  </Text>
                  {count > 0 && (
                    <View
                      style={[
                        tw`ml-1.5 rounded-full px-1.5 py-0.5`,
                        { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#EFF6FF' },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontFamily: 'Geist-SemiBold',
                          color: isActive ? '#fff' : '#2563EB',
                        }}
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* List */}
        {filtered.length === 0 ? (
          <View style={tw`flex-1 items-center justify-center`}>
            <MaterialCommunityIcons
              name="bell-check-outline"
              size={56}
              color="#D1D5DB"
            />
            <Text style={[tw`text-gray-400 mt-3`, typography.body]}>
              {activeFilter === 'all' ? 'No notifications' : `No ${activeFilter} notifications`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={grouped}
            keyExtractor={(item) =>
              item.type === 'header' ? `h-${item.label}` : item.notification.id
            }
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return (
                  <View style={tw`px-4 pt-5 pb-1.5`}>
                    <Text
                      style={[tw`text-gray-400 uppercase tracking-wider`, { fontSize: 11, fontFamily: 'Geist-SemiBold' }]}
                    >
                      {item.label}
                    </Text>
                  </View>
                );
              }
              return (
                <NotificationRow
                  notification={item.notification}
                  onPress={handlePress}
                  onDismiss={dismiss}
                />
              );
            }}
            contentContainerStyle={tw`pb-8`}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── Single notification row (redesigned) ────────────────────────────────────

function NotificationRow({
  notification,
  onPress,
  onDismiss,
}: {
  notification: AppNotification;
  onPress: (n: AppNotification) => void;
  onDismiss: (id: string) => void;
}) {
  const color = PRIORITY_COLOR[notification.priority];
  const bgColor = notification.read ? '#FFFFFF' : PRIORITY_BG[notification.priority];
  const iconName = NOTIFICATION_ICON[notification.type] || 'bell-outline';
  const timeAgo = formatTimeAgo(notification.createdAt);
  const hasTarget = !!getNavigationTarget(notification);

  return (
    <Pressable
      onPress={() => onPress(notification)}
      style={({ pressed }) => [
        tw`mx-3 mt-2 rounded-xl px-3.5 py-3 flex-row items-center`,
        {
          backgroundColor: bgColor,
          opacity: pressed ? 0.85 : 1,
          borderWidth: 1,
          borderColor: notification.read ? '#F3F4F6' : `${color}20`,
        },
      ]}
    >
      {/* Icon */}
      <View
        style={[
          tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
          { backgroundColor: `${color}14` },
        ]}
      >
        <MaterialCommunityIcons name={iconName as any} size={20} color={color} />
      </View>

      {/* Content */}
      <View style={tw`flex-1`}>
        <View style={tw`flex-row items-center`}>
          <Text
            style={[
              tw`text-gray-900 flex-1`,
              notification.read
                ? typography.captionMedium
                : typography.captionSemibold,
            ]}
            numberOfLines={1}
          >
            {notification.title}
            {(notification.coalesceCount ?? 0) > 1 && (
              <Text style={[tw`text-gray-400`, { fontSize: 11 }]}>
                {' '}({notification.coalesceCount})
              </Text>
            )}
          </Text>
          <Text style={[tw`text-gray-400 ml-2`, { fontSize: 11 }]}>
            {timeAgo}
          </Text>
        </View>
        <Text
          style={[tw`text-gray-500 mt-0.5`, typography.small]}
          numberOfLines={2}
        >
          {notification.body}
        </Text>
        {/* Inline action hint */}
        {hasTarget && !notification.read && (
          <Text style={[tw`mt-1`, { fontSize: 11, color, fontFamily: 'Geist-SemiBold' }]}>
            Tap to view →
          </Text>
        )}
      </View>

      {/* Dismiss */}
      <TouchableOpacity
        onPress={() => onDismiss(notification.id)}
        hitSlop={10}
        style={tw`ml-2 p-1`}
      >
        <MaterialCommunityIcons name="close" size={16} color="#D1D5DB" />
      </TouchableOpacity>
    </Pressable>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type GroupedItem =
  | { type: 'header'; label: string }
  | { type: 'notification'; notification: AppNotification };

function groupByDate(
  notifications: ReadonlyArray<AppNotification>,
): GroupedItem[] {
  const result: GroupedItem[] = [];
  let lastLabel = '';
  for (const n of notifications) {
    const label = dateLabel(n.createdAt);
    if (label !== lastLabel) {
      result.push({ type: 'header', label });
      lastLabel = label;
    }
    result.push({ type: 'notification', notification: n as AppNotification });
  }
  return result;
}

function dateLabel(ts: number): string {
  const now = new Date();
  const date = new Date(ts);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatTimeAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}
