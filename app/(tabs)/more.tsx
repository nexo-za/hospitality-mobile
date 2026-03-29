import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useAuth } from '@/contexts/AuthContext';
import { useShift } from '@/app/contexts/ShiftContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import approvalsService from '@/api/services/approvalsService';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type VisibilityRule = 'all' | 'manager' | 'admin' | 'non-server' | 'kitchen-or-manager';

interface MenuRow {
  icon: IconName;
  label: string;
  route: string;
  color: string;
  badge?: number | string;
  subtitle?: string;
  visibility?: VisibilityRule;
}

interface MenuSection {
  title: string;
  items: MenuRow[];
}

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.charAt(0)?.toUpperCase() || '';
  const l = lastName?.charAt(0)?.toUpperCase() || '';
  return f + l || '?';
}

function getRoleColor(role?: string): string {
  const r = role?.toUpperCase();
  if (r === 'ADMIN' || r === 'OWNER') return '#7C3AED';
  if (r === 'MANAGER' || r === 'STORE_MANAGER') return '#2563EB';
  if (r === 'SUPERVISOR') return '#0891B2';
  return '#6B7280';
}

function getRoleBg(role?: string): string {
  const r = role?.toUpperCase();
  if (r === 'ADMIN' || r === 'OWNER') return '#EDE9FE';
  if (r === 'MANAGER' || r === 'STORE_MANAGER') return '#DBEAFE';
  if (r === 'SUPERVISOR') return '#CFFAFE';
  return '#F3F4F6';
}

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const { shift } = useShift();
  const router = useRouter();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = user?.isAdmin === true;
  const isManager = user?.isStoreManager === true || isAdmin;
  const isShiftActive = shift?.status === 'active';

  const positionType = user?.positionType?.toUpperCase() ?? '';
  const isServer = positionType === 'SERVER' || positionType === 'BARTENDER';
  const isKitchenStaff = ['CHEF', 'SOUS_CHEF', 'EXPO', 'RUNNER'].includes(positionType);

  const canSeeItem = (rule?: VisibilityRule): boolean => {
    if (!rule || rule === 'all') return true;
    if (rule === 'admin') return isAdmin;
    if (rule === 'manager') return isManager;
    if (rule === 'non-server') return !isServer || isManager;
    if (rule === 'kitchen-or-manager') return isKitchenStaff || isManager;
    return true;
  };

  const fetchBadges = useCallback(async () => {
    try {
      if (isManager) {
        const approvals = await approvalsService.listPending(user?.storeId);
        setPendingApprovals(approvals?.length ?? 0);
      }
    } catch {
      // non-critical
    }
  }, [isManager, user?.storeId]);

  useFocusEffect(
    useCallback(() => {
      fetchBadges();
    }, [fetchBadges])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBadges();
    setRefreshing(false);
  }, [fetchBadges]);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleWebPortal = async () => {
    try {
      const url = 'https://app.nexo.co.za/dashboard';
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open web portal.');
    }
  };

  const buildSections = (): MenuSection[] => {
    const sections: MenuSection[] = [];

    sections.push({
      title: 'OPERATIONS',
      items: [
        {
          icon: 'clock-outline',
          label: 'Shift Management',
          route: '/more/shift',
          color: '#3B82F6',
          subtitle: isShiftActive ? 'Shift active' : undefined,
        },
        {
          icon: 'cash-register',
          label: 'Cash Till',
          route: '/more/cash-till',
          color: '#10B981',
          visibility: 'non-server',
        },
        {
          icon: 'check-decagram',
          label: 'Approvals',
          route: '/more/approvals',
          color: '#F59E0B',
          badge: pendingApprovals > 0 ? pendingApprovals : undefined,
          visibility: 'manager',
        },
        {
          icon: 'monitor-dashboard',
          label: 'KDS Viewer',
          route: '/more/kds',
          color: '#8B5CF6',
          visibility: 'kitchen-or-manager',
        },
      ],
    });

    sections.push({
      title: 'GUESTS & RESERVATIONS',
      items: [
        {
          icon: 'account-group',
          label: 'Guests',
          route: '/more/guests',
          color: '#EC4899',
          visibility: 'non-server',
        },
        {
          icon: 'calendar-clock',
          label: 'Reservations',
          route: '/more/reservations',
          color: '#6366F1',
          visibility: 'non-server',
        },
        {
          icon: 'clipboard-list',
          label: 'Waitlist',
          route: '/more/waitlist',
          color: '#14B8A6',
        },
      ],
    });

    sections.push({
      title: 'REPORTS & INSIGHTS',
      items: [
        {
          icon: 'chart-bar',
          label: 'Reports',
          route: '/more/reports',
          color: '#0EA5E9',
          visibility: 'manager',
        },
        {
          icon: 'account-star',
          label: 'Staff Performance',
          route: '/more/staff-performance',
          color: '#F97316',
          visibility: 'manager',
        },
      ],
    });

    sections.push({
      title: 'INVENTORY & BOH',
      items: [
        {
          icon: 'delete-variant',
          label: 'Waste Log',
          route: '/more/waste',
          color: '#EF4444',
          visibility: 'kitchen-or-manager',
        },
        {
          icon: 'counter',
          label: 'Inventory Counts',
          route: '/more/inventory-counts',
          color: '#8B5CF6',
          visibility: 'manager',
        },
      ],
    });

    sections.push({
      title: 'ACCOUNT',
      items: [
        {
          icon: 'account-circle',
          label: 'Profile',
          route: '/(tabs)/profile',
          color: '#6B7280',
        },
        {
          icon: 'cog-outline',
          label: 'Settings',
          route: '/(account)/settings',
          color: '#6B7280',
        },
        {
          icon: 'lifebuoy',
          label: 'Help & Support',
          route: '/more/support',
          color: '#0EA5E9',
        },
        {
          icon: 'information-outline',
          label: 'About',
          route: '/(account)/about',
          color: '#6B7280',
        },
      ],
    });

    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => canSeeItem(item.visibility)),
      }))
      .filter((s) => s.items.length > 0);
  };

  const sections = buildSections();

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-50`}
      contentContainerStyle={tw`pb-16`}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Profile Card */}
      <View style={tw`bg-white mx-4 mt-4 rounded-2xl overflow-hidden`}>
        <View style={tw`flex-row items-center px-4 py-4`}>
          <View
            style={[
              tw`w-12 h-12 rounded-full items-center justify-center mr-3`,
              { backgroundColor: getRoleBg(user?.role) },
            ]}
          >
            <Text
              style={[
                tw`text-lg`,
                typography.headingSemibold,
                { color: getRoleColor(user?.role) },
              ]}
            >
              {getInitials(user?.firstName, user?.lastName)}
            </Text>
          </View>
          <View style={tw`flex-1`}>
            <Text style={[tw`text-base`, typography.bodySemibold]} numberOfLines={1}>
              {user?.firstName} {user?.lastName}
            </Text>
            <View style={tw`flex-row items-center mt-0.5`}>
              <View
                style={[
                  tw`rounded-full px-2 py-0.5 mr-2`,
                  { backgroundColor: getRoleBg(user?.role) },
                ]}
              >
                <Text
                  style={[
                    tw`text-xs`,
                    typography.smallMedium,
                    { color: getRoleColor(user?.role) },
                  ]}
                >
                  {user?.role}
                </Text>
              </View>
              <Text
                style={[tw`text-xs text-gray-400`, typography.small]}
                numberOfLines={1}
              >
                {user?.storeName}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile' as any)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="chevron-right" size={22} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {isShiftActive && (
          <TouchableOpacity
            style={tw`flex-row items-center px-4 py-2.5 border-t border-gray-100 bg-emerald-50`}
            onPress={() => router.push('/more/shift' as any)}
            activeOpacity={0.7}
          >
            <View style={tw`w-2 h-2 rounded-full bg-emerald-500 mr-2`} />
            <Text style={[tw`text-xs text-emerald-700 flex-1`, typography.smallMedium]}>
              Shift active &middot; {shift?.staffName || 'Current shift'}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color="#059669" />
          </TouchableOpacity>
        )}
      </View>

      {/* Web Portal Quick Action - Admin/Manager only */}
      {isManager && (
        <TouchableOpacity
          style={tw`mx-4 mt-3 bg-blue-50 rounded-xl flex-row items-center px-4 py-3`}
          onPress={handleWebPortal}
          activeOpacity={0.7}
        >
          <View
            style={tw`w-8 h-8 rounded-lg bg-blue-100 items-center justify-center mr-3`}
          >
            <MaterialCommunityIcons name="open-in-new" size={18} color="#2563EB" />
          </View>
          <View style={tw`flex-1`}>
            <Text style={[tw`text-sm text-blue-700`, typography.captionSemibold]}>
              Open Web Portal
            </Text>
            <Text style={[tw`text-xs text-blue-400`, typography.small]}>
              Advanced reporting, config &amp; setup
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#93C5FD" />
        </TouchableOpacity>
      )}

      {/* Menu Sections */}
      {sections.map((section) => (
        <View key={section.title} style={tw`mt-5`}>
          <Text
            style={[
              tw`text-xs text-gray-400 px-5 mb-2`,
              typography.captionSemibold,
              { letterSpacing: 0.8 },
            ]}
          >
            {section.title}
          </Text>
          <View style={tw`bg-white mx-4 rounded-xl overflow-hidden`}>
            {section.items.map((item, idx) => (
              <TouchableOpacity
                key={item.route}
                style={tw`flex-row items-center px-4 py-3.5 ${
                  idx < section.items.length - 1
                    ? 'border-b border-gray-50'
                    : ''
                }`}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.6}
              >
                <View
                  style={[
                    tw`w-9 h-9 rounded-xl items-center justify-center mr-3`,
                    { backgroundColor: item.color + '12' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={20}
                    color={item.color}
                  />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-base`, typography.body]}>
                    {item.label}
                  </Text>
                  {item.subtitle && (
                    <Text style={[tw`text-xs text-gray-400 mt-0.5`, typography.small]}>
                      {item.subtitle}
                    </Text>
                  )}
                </View>
                {item.badge != null && (
                  <View
                    style={tw`bg-red-500 rounded-full min-w-5 h-5 items-center justify-center px-1.5 mr-2`}
                  >
                    <Text style={[tw`text-white text-xs`, typography.smallMedium]}>
                      {item.badge}
                    </Text>
                  </View>
                )}
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="#D1D5DB"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* App Version */}
      <View style={tw`items-center mt-6 mb-2`}>
        <Text style={[tw`text-xs text-gray-300`, typography.small]}>
          Nexo v{(require('../../app.json') as any).expo?.version || '1.0.0'}
        </Text>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={tw`mx-4 mt-2 bg-white rounded-xl py-3.5 items-center border border-red-100`}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <View style={tw`flex-row items-center`}>
          <MaterialCommunityIcons
            name="logout"
            size={18}
            color="#EF4444"
            style={tw`mr-2`}
          />
          <Text style={[tw`text-red-500 text-base`, typography.bodySemibold]}>
            Sign Out
          </Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}
