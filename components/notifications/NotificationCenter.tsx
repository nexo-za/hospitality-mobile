import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  type AppNotification,
  NotificationPriority,
  getNavigationTarget,
} from '@/types/notifications';

// ─── Priority accent colours ─────────────────────────────────────────────────

const PRIORITY_COLOR: Record<NotificationPriority, string> = {
  [NotificationPriority.CRITICAL]: '#DC2626',
  [NotificationPriority.HIGH]: '#EA580C',
  [NotificationPriority.MEDIUM]: '#2563EB',
  [NotificationPriority.LOW]: '#9CA3AF',
};

// ─── Bell icon with badge (embed in the header) ──────────────────────────────

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

  const grouped = useMemo(() => groupByDate(notifications), [notifications]);

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 bg-gray-50`}>
        {/* Header */}
        <View
          style={tw`flex-row items-center justify-between px-4 pt-4 pb-3 bg-white border-b border-gray-100`}
        >
          <Text style={[tw`text-gray-900`, typography.h3]}>Notifications</Text>
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
              <MaterialCommunityIcons
                name="close"
                size={24}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>
        </View>

        {notifications.length === 0 ? (
          <View style={tw`flex-1 items-center justify-center`}>
            <MaterialCommunityIcons
              name="bell-check-outline"
              size={56}
              color="#D1D5DB"
            />
            <Text style={[tw`text-gray-400 mt-3`, typography.body]}>
              No notifications
            </Text>
          </View>
        ) : (
          <FlatList
            data={grouped}
            keyExtractor={(item) =>
              item.type === 'header' ? item.label : item.notification.id
            }
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return (
                  <View style={tw`px-4 pt-4 pb-1`}>
                    <Text
                      style={[tw`text-gray-500 uppercase`, typography.small]}
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

// ─── Single notification row ─────────────────────────────────────────────────

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
  const timeAgo = formatTimeAgo(notification.createdAt);

  return (
    <Pressable
      onPress={() => onPress(notification)}
      style={({ pressed }) => [
        tw`mx-3 mt-2 rounded-xl px-4 py-3 flex-row items-start`,
        {
          backgroundColor: notification.read
            ? '#FFFFFF'
            : '#F0F7FF',
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Priority stripe */}
      <View
        style={{
          width: 4,
          borderRadius: 2,
          backgroundColor: color,
          alignSelf: 'stretch',
          marginRight: 12,
        }}
      />

      <View style={tw`flex-1`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Text
            style={[
              tw`text-gray-900`,
              notification.read
                ? typography.captionMedium
                : typography.captionSemibold,
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text style={[tw`text-gray-400 ml-2`, { fontSize: 11 }]}>
            {timeAgo}
          </Text>
        </View>
        <Text
          style={[tw`text-gray-600 mt-0.5`, typography.small]}
          numberOfLines={2}
        >
          {notification.body}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => onDismiss(notification.id)}
        hitSlop={10}
        style={tw`ml-2 mt-1`}
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
    result.push({ type: 'notification', notification: n });
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
