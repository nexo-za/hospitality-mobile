import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '@/styles/tailwind';
import { typography } from '@/styles/typography';
import { Text } from '@/components/Text';
import { useOrder } from '@/contexts/OrderContext';
import { useMenu } from '@/contexts/MenuContext';
import { useAuth } from '@/contexts/AuthContext';
import { ItemActionSheet } from '@/components/order/ItemActionSheet';
import { CheckActionSheet } from '@/components/order/CheckActionSheet';
import { TransferCheckSheet } from '@/components/table/TransferCheckSheet';
import HospitalityPaymentSheet from '@/components/payment/HospitalityPaymentSheet';
import { CartPanel } from '@/components/order/CartPanel';
import { MenuBrowser } from '@/components/order/MenuBrowser';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { useMenuSearch, getHighlightSegments } from '@/hooks/useMenuSearch';
import billingService from '@/api/services/billingService';
import { useTables } from '@/contexts/TablesContext';
import type { CheckItem, MenuItem } from '@/types/hospitality';

export default function OrderDetailScreen() {
  const { id, pay } = useLocalSearchParams<{ id: string; pay?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const productColumns = width >= 1024 ? 'w-1/3' : 'w-1/2';

  const safeGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/tables' as any);
    }
  }, [router]);

  const {
    menuItems,
    isLoading: menuLoading,
    loadMenuItems,
    refreshMenus,
  } = useMenu();

  const {
    currentCheck,
    loadCheck,
    fireItems,
    voidCheck,
    reopenCheck,
    transferCheck,
    voidItem,
    addItem,
    updateItem,
    removeItem,
  } = useOrder();

  const { tables, refreshTables } = useTables();

  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<CheckItem | null>(null);
  const [showItemSheet, setShowItemSheet] = useState(false);
  const [showCheckSheet, setShowCheckSheet] = useState(false);
  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFiring, setIsFiring] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [recentItemIds, setRecentItemIds] = useState<number[]>([]);

  const {
    query: localSearch,
    setQuery: setLocalSearch,
    debouncedQuery: debouncedSearch,
    filteredItems,
    highlightMap,
  } = useMenuSearch(menuItems, selectedCategory);

  const reloadMenu = useCallback(() => {
    if (user) {
      refreshMenus((user as any).storeId);
      loadMenuItems({ availableOnly: false });
    }
  }, [user, refreshMenus, loadMenuItems]);

  useEffect(() => {
    load();
    reloadMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const load = async () => {
    setLoading(true);
    try {
      await loadCheck(Number(id));
    } catch {
      Alert.alert('Error', 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const payHandledRef = useRef(false);

  useEffect(() => {
    if (pay === '1' && currentCheck && !loading && !payHandledRef.current) {
      payHandledRef.current = true;
      setShowPaymentModal(true);
    }
  }, [pay, currentCheck, loading]);

  useRealtimeUpdates({
    storeId: (user as any)?.storeId,
    onCheckUpdate: (data) => {
      if (data.checkId === Number(id)) {
        loadCheck(Number(id)).catch(() => undefined);
      }
    },
    onKdsUpdate: () => {
      loadCheck(Number(id)).catch(() => undefined);
    },
    onOrderReady: (data) => {
      if (currentCheck && data.checkNumber === currentCheck.checkNumber) {
        Alert.alert('Order Ready', `${data.tableName || 'Table'}: Items ready for pickup`);
        loadCheck(Number(id)).catch(() => undefined);
      }
    },
  });

  const categories = useMemo(() => {
    const cats = new Set<string>();
    menuItems.forEach((item: any) => {
      const catName = item.categoryName || item.category?.name || item.category;
      if (catName && typeof catName === 'string') cats.add(catName);
    });
    return [
      { id: 'all', name: 'All', icon: 'grid' as const },
      ...Array.from(cats)
        .sort()
        .map((c) => ({ id: c, name: c, icon: 'silverware-fork-knife' as const })),
    ];
  }, [menuItems]);

  // ── Item actions ──────────────────────────────────────────────────

  const handleQuickAdd = useCallback(
    async (item: MenuItem) => {
      if (!currentCheck) return;
      try {
        await addItem(currentCheck.id, { menuItemId: item.id, quantity: 1 });
        setRecentItemIds((prev) => [item.id, ...prev.filter((i) => i !== item.id)].slice(0, 20));
      } catch (e: any) {
        Alert.alert('Could not add item', e.message || 'Please try again');
      }
    },
    [currentCheck, addItem],
  );

  const handleQuantityChange = useCallback(
    async (itemId: number, newQuantity: number) => {
      try {
        await updateItem(itemId, { quantity: newQuantity });
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Could not update quantity');
      }
    },
    [updateItem],
  );

  const handleRemoveItem = useCallback(
    async (itemId: number) => {
      try {
        await removeItem(itemId);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Could not remove item');
      }
    },
    [removeItem],
  );

  const handleFire = useCallback(async () => {
    if (!currentCheck || isFiring) return;
    const activeItems = (currentCheck.items || []).filter((i) => i.status !== 'VOIDED');
    const unfiredItems = activeItems.filter((i) => i.firingStatus === 'FIRE_HOLD');
    setIsFiring(true);
    try {
      await fireItems(currentCheck.id, {});
      await loadCheck(currentCheck.id);
      Alert.alert(
        'Sent to Kitchen',
        `${unfiredItems.length} item${unfiredItems.length !== 1 ? 's' : ''} fired to kitchen.`,
      );
    } catch (e: any) {
      Alert.alert('Fire Failed', e.message || 'Could not send items to kitchen.');
    } finally {
      setIsFiring(false);
    }
  }, [currentCheck, isFiring, fireItems, loadCheck]);

  const handleVoidItem = async (itemId: number, reasonCode: string, reasonText?: string) => {
    try {
      await voidItem(itemId, { reasonCode, reasonText });
      setShowItemSheet(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleMarkServed = async (itemId: number) => {
    if (!currentCheck) return;
    try {
      await updateItem(itemId, {} as any);
      await loadCheck(currentCheck.id);
      setShowItemSheet(false);
    } catch {
      try {
        const api = (await import('@/api/api')).default;
        await api.patch(`/hospitality/checks/items/${itemId}/status`, { status: 'SERVED' });
        await loadCheck(currentCheck.id);
        setShowItemSheet(false);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Could not mark item as served');
      }
    }
  };

  const handleItemDiscount = async (
    itemId: number,
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT',
    value: number,
  ) => {
    if (!currentCheck) return;
    try {
      await billingService.applyDiscount(currentCheck.id, {
        checkItemId: itemId,
        name: discountType === 'PERCENTAGE' ? `${value}% off` : `R${value} off`,
        discountType,
        scope: 'ITEM',
        value,
      });
      await loadCheck(currentCheck.id);
      setShowItemSheet(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleRepeatItem = useCallback(
    async (item: CheckItem) => {
      if (!currentCheck) return;
      try {
        await addItem(currentCheck.id, {
          menuItemId: item.menuItemId,
          variantId: item.variantId,
          quantity: item.quantity,
          seatNumber: item.seatNumber,
          courseNumber: item.courseNumber,
          specialRequests: item.specialRequests,
          modifiers: item.modifiers?.map((m) => ({
            modifierId: m.modifierId,
            quantity: m.quantity,
          })),
        });
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    },
    [currentCheck, addItem],
  );

  const handleUpdateSeat = async (itemId: number, seatNumber: number) => {
    try {
      await updateItem(itemId, { seatNumber });
      setShowItemSheet(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleUpdateCourse = async (itemId: number, courseNumber: number) => {
    try {
      await updateItem(itemId, { courseNumber });
      setShowItemSheet(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // ── Check-level actions ───────────────────────────────────────────

  const handleCheckDiscount = async (
    name: string,
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT',
    value: number,
  ) => {
    if (!currentCheck) return;
    try {
      await billingService.applyDiscount(currentCheck.id, {
        name,
        discountType,
        scope: 'CHECK',
        value,
      });
      await loadCheck(currentCheck.id);
      setShowCheckSheet(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleServiceCharge = async (
    name: string,
    chargeType: 'PERCENTAGE' | 'FIXED_AMOUNT',
    value: number,
  ) => {
    if (!currentCheck) return;
    try {
      await billingService.applyServiceCharge(currentCheck.id, { name, chargeType, value });
      await loadCheck(currentCheck.id);
      setShowCheckSheet(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleVoidCheck = async (reason: string) => {
    if (!currentCheck) return;
    try {
      await voidCheck(currentCheck.id, reason);
      setShowCheckSheet(false);
      safeGoBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleReopenCheck = async () => {
    if (!currentCheck) return;
    try {
      await reopenCheck(currentCheck.id);
      setShowCheckSheet(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleTransfer = () => {
    setShowCheckSheet(false);
    setShowTransferSheet(true);
  };

  const handleTransferToTable = async (checkId: number, fromTableId: number, toTableId: number) => {
    await transferCheck(checkId, { transferType: 'TABLE', fromTableId, toTableId });
    const storeId = (user as any)?.storeId;
    if (storeId) refreshTables(storeId).catch(() => undefined);
    await loadCheck(checkId);
  };

  const handleTransferToServer = async (checkId: number, fromServerId: number, toServerId: number) => {
    await transferCheck(checkId, { transferType: 'SERVER', fromServerId, toServerId });
    await loadCheck(checkId);
  };

  const handleSplit = () => {
    setShowCheckSheet(false);
    if (currentCheck) router.push(`/order/payment?checkId=${currentCheck.id}` as any);
  };

  // ── Derived state ─────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!currentCheck) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <Text style={[tw`text-center mt-10 text-gray-500`, typography.body]}>Order not found</Text>
      </SafeAreaView>
    );
  }

  const check = currentCheck;
  const isOpen = check.status === 'OPEN' || check.status === 'REOPENED';
  const activeItems = (check.items || []).filter((i) => i.status !== 'VOIDED');
  const unfiredItems = activeItems.filter((i) => i.firingStatus === 'FIRE_HOLD');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw`flex-1 bg-gray-50`}
    >
      <SafeAreaView style={tw`flex-1`}>
        <View style={tw`flex-1 flex-row`}>
          {/* LEFT: Menu Browser */}
          <View style={tw`flex-1`}>
            <MenuBrowser
              menuItems={menuItems}
              filteredItems={filteredItems}
              menuLoading={menuLoading}
              categories={categories}
              selectedCategory={selectedCategory}
              searchQuery={localSearch}
              debouncedQuery={debouncedSearch}
              highlightMap={highlightMap}
              recentItemIds={recentItemIds}
              isOpen={isOpen}
              productColumns={productColumns}
              onCategoryChange={setSelectedCategory}
              onSearchChange={setLocalSearch}
              onQuickAdd={handleQuickAdd}
              onReloadMenu={reloadMenu}
              onBack={safeGoBack}
              getHighlightSegments={getHighlightSegments}
            />
          </View>

          {/* RIGHT: Cart Panel */}
          <View style={[tw`bg-white border-l border-gray-200`, { width: Math.max(width * 0.30, 300) }]}>
            <View style={tw`px-3 py-2 border-b border-gray-100`}>
              <Text variant="bold" style={tw`text-gray-900 text-base`}>Cart</Text>
            </View>
            <CartPanel
              check={check}
              isOpen={isOpen}
              isFiring={isFiring}
              unfiredCount={unfiredItems.length}
              onEditCheck={() => setShowCheckSheet(true)}
              onQuantityChange={handleQuantityChange}
              onVoidItem={(item) => {
                setSelectedItem(item);
                setShowItemSheet(true);
              }}
              onRepeatItem={handleRepeatItem}
              onMoreActions={(item) => {
                setSelectedItem(item);
                setShowItemSheet(true);
              }}
              onRemoveItem={handleRemoveItem}
              onFire={handleFire}
              onPayment={() => activeItems.length > 0 && setShowPaymentModal(true)}
            />
          </View>
        </View>

        {/* Action Sheets */}
        <ItemActionSheet
          visible={showItemSheet}
          item={selectedItem}
          onClose={() => {
            setShowItemSheet(false);
            setSelectedItem(null);
          }}
          onVoid={handleVoidItem}
          onDiscount={handleItemDiscount}
          onRepeat={handleRepeatItem}
          onUpdateSeat={handleUpdateSeat}
          onUpdateCourse={handleUpdateCourse}
          onMarkServed={handleMarkServed}
        />
        <CheckActionSheet
          visible={showCheckSheet}
          check={check}
          onClose={() => setShowCheckSheet(false)}
          onTransfer={handleTransfer}
          onSplit={handleSplit}
          onDiscount={handleCheckDiscount}
          onServiceCharge={handleServiceCharge}
          onVoidCheck={handleVoidCheck}
          onReopenCheck={handleReopenCheck}
        />
        <TransferCheckSheet
          visible={showTransferSheet}
          check={check}
          currentTable={tables.find((t) => t.id === check.tableId) ?? null}
          availableTables={tables}
          storeId={(user as any)?.storeId ?? null}
          onClose={() => setShowTransferSheet(false)}
          onTransferToTable={handleTransferToTable}
          onTransferToServer={handleTransferToServer}
        />
        <HospitalityPaymentSheet
          visible={showPaymentModal}
          checkId={check.id}
          onClose={() => {
            setShowPaymentModal(false);
            load();
          }}
          onComplete={() => {
            setShowPaymentModal(false);
            load();
            safeGoBack();
          }}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
