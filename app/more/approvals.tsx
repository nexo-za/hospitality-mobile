import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useApprovals } from '@/contexts/ApprovalsContext';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ApprovalRequest, ApprovalRequestType } from '@/types/hospitality';

const TYPE_CONFIG: Record<
  ApprovalRequestType,
  { icon: string; color: string; borderColor: string }
> = {
  VOID_ITEM: { icon: 'close-circle', color: '#DC2626', borderColor: '#DC2626' },
  VOID_CHECK: { icon: 'close-circle', color: '#DC2626', borderColor: '#DC2626' },
  DISCOUNT: { icon: 'tag', color: '#D97706', borderColor: '#D97706' },
  REOPEN_CHECK: { icon: 'refresh', color: '#2563EB', borderColor: '#2563EB' },
  REFUND: { icon: 'cash-refund', color: '#EA580C', borderColor: '#EA580C' },
};

function getRequestDescription(item: ApprovalRequest): string {
  const checkRef = item.checkId ? ` on Check #${item.checkId}` : '';
  switch (item.requestType) {
    case 'VOID_ITEM':
      return `Void Item${checkRef}`;
    case 'VOID_CHECK':
      return `Void Check #${item.checkId || '?'}`;
    case 'DISCOUNT':
      return `Apply Discount${checkRef}`;
    case 'REOPEN_CHECK':
      return `Reopen Check #${item.checkId || '?'}`;
    case 'REFUND':
      return `Refund${checkRef}`;
    default:
      return item.requestType;
  }
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

function getPayloadDetails(item: ApprovalRequest): string | null {
  if (!item.payload) return null;
  const parts: string[] = [];
  const p = item.payload as Record<string, unknown>;
  if (p.itemName) parts.push(String(p.itemName));
  if (p.amount != null) parts.push(`R${Number(p.amount).toFixed(2)}`);
  if (p.reason) parts.push(String(p.reason));
  if (p.discountPercent != null) parts.push(`${p.discountPercent}% off`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

function ApprovalCard({
  item,
  onApprove,
  onReject,
}: {
  item: ApprovalRequest;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const config = TYPE_CONFIG[item.requestType] || TYPE_CONFIG.VOID_ITEM;
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const payloadDetails = getPayloadDetails(item);

  const submitReject = () => {
    if (reason.trim().length < 3) return;
    onReject(reason.trim());
    setRejecting(false);
    setReason('');
  };

  return (
    <View
      style={[
        tw`bg-white rounded-xl mb-3 mx-4 border border-gray-100 overflow-hidden`,
        { borderLeftWidth: 4, borderLeftColor: config.borderColor },
      ]}
    >
      <View style={tw`p-4`}>
        <View style={tw`flex-row items-center mb-2`}>
          <MaterialCommunityIcons
            name={config.icon as any}
            size={20}
            color={config.color}
          />
          <Text
            style={[tw`text-sm flex-1 ml-2`, typography.bodySemibold]}
          >
            {getRequestDescription(item)}
          </Text>
          <Text style={[tw`text-xs text-gray-400`, typography.caption]}>
            {formatTimeAgo(item.createdAt)}
          </Text>
        </View>

        <Text style={[tw`text-sm text-gray-500`, typography.body]}>
          Requested by {item.requestedByName || `User #${item.requestedBy}`}
        </Text>

        {payloadDetails && (
          <View style={tw`bg-gray-50 rounded-lg px-3 py-2 mt-2`}>
            <Text style={[tw`text-sm text-gray-600`, typography.body]}>
              {payloadDetails}
            </Text>
          </View>
        )}

        {!rejecting ? (
          <View style={tw`flex-row mt-3`}>
            <TouchableOpacity
              style={tw`flex-1 bg-green-500 rounded-lg py-2.5 items-center mr-2 flex-row justify-center`}
              onPress={onApprove}
            >
              <MaterialCommunityIcons
                name="check"
                size={16}
                color="#FFFFFF"
              />
              <Text
                style={[tw`text-white text-sm ml-1`, typography.bodySemibold]}
              >
                Approve
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`flex-1 bg-red-50 border border-red-200 rounded-lg py-2.5 items-center ml-2 flex-row justify-center`}
              onPress={() => setRejecting(true)}
            >
              <MaterialCommunityIcons
                name="close"
                size={16}
                color="#DC2626"
              />
              <Text
                style={[tw`text-red-600 text-sm ml-1`, typography.bodySemibold]}
              >
                Reject
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={tw`mt-3`}>
            <TextInput
              style={tw`border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50`}
              placeholder="Reason for rejection (min 3 chars)..."
              value={reason}
              onChangeText={setReason}
              autoFocus
              multiline
            />
            <View style={tw`flex-row mt-2`}>
              <TouchableOpacity
                style={tw`flex-1 bg-gray-100 rounded-lg py-2.5 items-center mr-2`}
                onPress={() => {
                  setRejecting(false);
                  setReason('');
                }}
              >
                <Text
                  style={[tw`text-gray-600 text-sm`, typography.bodySemibold]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  tw`flex-1 rounded-lg py-2.5 items-center ml-2`,
                  reason.trim().length >= 3
                    ? tw`bg-red-500`
                    : tw`bg-red-200`,
                ]}
                onPress={submitReject}
                disabled={reason.trim().length < 3}
              >
                <Text
                  style={[tw`text-white text-sm`, typography.bodySemibold]}
                >
                  Confirm Reject
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ApprovalsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { pendingApprovals, isLoading, loadPendingApprovals, approve, reject } =
    useApprovals();

  useEffect(() => {
    loadPendingApprovals((user as any)?.storeId);
  }, [user]);

  const handleApprove = useCallback(
    async (id: number) => {
      try {
        await approve(id);
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    },
    [approve],
  );

  const handleReject = useCallback(
    async (id: number, reason: string) => {
      try {
        await reject(id, reason);
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    },
    [reject],
  );

  const pendingCount = pendingApprovals.length;

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View
        style={tw`flex-row items-center px-4 py-3 bg-white border-b border-gray-100`}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={[tw`text-lg ml-3 flex-1`, typography.headingSemibold]}>
          Pending Approvals
        </Text>
        {pendingCount > 0 && (
          <View
            style={tw`bg-red-500 rounded-full min-w-6 h-6 items-center justify-center px-1.5`}
          >
            <Text
              style={[tw`text-xs text-white`, typography.captionSemibold]}
            >
              {pendingCount}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={pendingApprovals}
        keyExtractor={(i) => i.id.toString()}
        renderItem={({ item }) => (
          <ApprovalCard
            item={item}
            onApprove={() => handleApprove(item.id)}
            onReject={(reason) => handleReject(item.id, reason)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => loadPendingApprovals((user as any)?.storeId)}
          />
        }
        contentContainerStyle={tw`pb-8 pt-3`}
        ListEmptyComponent={
          <View style={tw`items-center py-16`}>
            <MaterialCommunityIcons
              name="check-all"
              size={48}
              color="#9CA3AF"
            />
            <Text style={[tw`text-gray-400 mt-3`, typography.body]}>
              No pending approvals
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
