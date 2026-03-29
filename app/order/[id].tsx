import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { useOrder } from '@/contexts/OrderContext';
import { useMenu } from '@/contexts/MenuContext';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ItemActionSheet } from '@/components/order/ItemActionSheet';
import { CheckActionSheet } from '@/components/order/CheckActionSheet';
import HospitalityPaymentSheet from '@/components/payment/HospitalityPaymentSheet';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { useMenuSearch, getHighlightSegments } from '@/hooks/useMenuSearch';
import billingService from '@/api/services/billingService';
import type { CheckItem, MenuItem } from '@/types/hospitality';

export default function OrderDetailScreen() {
  const { id, pay } = useLocalSearchParams<{ id: string; pay?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const productColumns = width >= 1024 ? 'w-1/3' : 'w-1/2';
  const searchInputRef = useRef<TextInput>(null);

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
    voidItem,
    addItem,
    updateItem,
  } = useOrder();

  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<CheckItem | null>(null);
  const [showItemSheet, setShowItemSheet] = useState(false);
  const [showCheckSheet, setShowCheckSheet] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFiring, setIsFiring] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
  }, [id, user]);

  const load = async () => {
    setLoading(true);
    try { await loadCheck(Number(id)); }
    catch { Alert.alert('Error', 'Failed to load order'); }
    finally { setLoading(false); }
  };

  const payHandledRef = useRef(false);

  // Auto-open payment sheet when navigated with ?pay=1 (once only)
  useEffect(() => {
    if (pay === '1' && currentCheck && !loading && !payHandledRef.current) {
      payHandledRef.current = true;
      setShowPaymentModal(true);
    }
  }, [pay, currentCheck, loading]);

  // Real-time sync: reload check when kitchen updates items
  useRealtimeUpdates({
    storeId: (user as any)?.storeId,
    onCheckUpdate: (data) => {
      if (data.checkId === Number(id)) {
        loadCheck(Number(id)).catch(() => undefined);
      }
    },
    onKdsUpdate: () => {
      // Any KDS activity (ticket started, ready, bumped) may change item status
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
      ...Array.from(cats).sort().map((c) => ({ id: c, name: c, icon: 'silverware-fork-knife' as const })),
    ];
  }, [menuItems]);

  const handleQuickAdd = useCallback(async (item: MenuItem) => {
    if (!currentCheck) return;
    try {
      await addItem(currentCheck.id, { menuItemId: item.id, quantity: 1 });
    } catch (e: any) {
      Alert.alert('Could not add item', e.message || 'Please try again');
    }
  }, [currentCheck, addItem]);

  const handleFire = async () => {
    if (!currentCheck || isFiring) return;
    setIsFiring(true);
    try {
      await fireItems(currentCheck.id, {});
      await loadCheck(currentCheck.id);
      Alert.alert('Sent to Kitchen', `${unfiredItems.length} item${unfiredItems.length !== 1 ? 's' : ''} fired to kitchen.`);
    } catch (e: any) {
      Alert.alert('Fire Failed', e.message || 'Could not send items to kitchen.');
    } finally {
      setIsFiring(false);
    }
  };

  const handleVoidItem = async (itemId: number, reasonCode: string, reasonText?: string) => {
    try { await voidItem(itemId, { reasonCode, reasonText }); setShowItemSheet(false); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleMarkServed = async (itemId: number) => {
    if (!currentCheck) return;
    try {
      await updateItem(itemId, {} as any);
      await loadCheck(currentCheck.id);
      setShowItemSheet(false);
    } catch {
      // If updateItem doesn't support status change, use a direct API call
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

  const handleItemDiscount = async (itemId: number, discountType: 'PERCENTAGE' | 'FIXED_AMOUNT', value: number) => {
    if (!currentCheck) return;
    try {
      await billingService.applyDiscount(currentCheck.id, { checkItemId: itemId, name: discountType === 'PERCENTAGE' ? `${value}% off` : `R${value} off`, discountType, scope: 'ITEM', value });
      await loadCheck(currentCheck.id);
      setShowItemSheet(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleRepeatItem = async (item: CheckItem) => {
    if (!currentCheck) return;
    try {
      await addItem(currentCheck.id, { menuItemId: item.menuItemId, variantId: item.variantId, quantity: item.quantity, seatNumber: item.seatNumber, courseNumber: item.courseNumber, specialRequests: item.specialRequests, modifiers: item.modifiers?.map((m) => ({ modifierId: m.modifierId, quantity: m.quantity })) });
      setShowItemSheet(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleUpdateSeat = async (itemId: number, seatNumber: number) => {
    try { await updateItem(itemId, { seatNumber }); setShowItemSheet(false); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleUpdateCourse = async (itemId: number, courseNumber: number) => {
    try { await updateItem(itemId, { courseNumber }); setShowItemSheet(false); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleCheckDiscount = async (name: string, discountType: 'PERCENTAGE' | 'FIXED_AMOUNT', value: number) => {
    if (!currentCheck) return;
    try { await billingService.applyDiscount(currentCheck.id, { name, discountType, scope: 'CHECK', value }); await loadCheck(currentCheck.id); setShowCheckSheet(false); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleServiceCharge = async (name: string, chargeType: 'PERCENTAGE' | 'FIXED_AMOUNT', value: number) => {
    if (!currentCheck) return;
    try { await billingService.applyServiceCharge(currentCheck.id, { name, chargeType, value }); await loadCheck(currentCheck.id); setShowCheckSheet(false); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleVoidCheck = async (reason: string) => {
    if (!currentCheck) return;
    try { await voidCheck(currentCheck.id, reason); setShowCheckSheet(false); router.back(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleReopenCheck = async () => {
    if (!currentCheck) return;
    try { await reopenCheck(currentCheck.id); setShowCheckSheet(false); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleTransfer = () => {
    setShowCheckSheet(false);
    Alert.alert('Transfer Check', 'Select a target table to transfer this check to.', [{ text: 'OK' }]);
  };

  const handleSplit = () => {
    setShowCheckSheet(false);
    if (currentCheck) router.push(`/order/payment?checkId=${currentCheck.id}` as any);
  };

  if (loading) {
    return (<View style={tw`flex-1 items-center justify-center bg-white`}><ActivityIndicator size="large" color="#3B82F6" /></View>);
  }
  if (!currentCheck) {
    return (<SafeAreaView style={tw`flex-1 bg-white`}><Text style={[tw`text-center mt-10 text-gray-500`, typography.body]}>Order not found</Text></SafeAreaView>);
  }

  const check = currentCheck;
  const isOpen = check.status === 'OPEN' || check.status === 'REOPENED';
  const activeItems = (check.items || []).filter((i) => i.status !== 'VOIDED');
  const unfiredItems = activeItems.filter((i: any) => i.firingStatus === 'FIRE_HOLD');
  const guest = (check as any).guestProfile as { firstName?: string; lastName?: string; isVIP?: boolean; phone?: string; email?: string; tags?: string[]; totalVisits?: number } | null;

  const renderProductGrid = () => {
    if (menuLoading) {
      return (<View style={tw`flex-1 justify-center items-center`}><ActivityIndicator size="large" color="#3b82f6" /><Text style={tw`text-gray-600 mt-4`}>Loading menu...</Text></View>);
    }
    if (filteredItems.length === 0) {
      return (
        <View style={tw`flex-1 justify-center items-center p-6`}>
          <MaterialCommunityIcons name="magnify-close" size={48} color="#9ca3af" style={tw`mb-4`} />
          <Text style={tw`text-gray-900 text-center mb-2 text-lg font-bold`}>No Items Found</Text>
          <Text style={tw`text-gray-600 text-center mb-6`}>
            {selectedCategory !== 'all' ? `No items in "${selectedCategory}".` : debouncedSearch ? `No items matching "${debouncedSearch}".` : 'No menu items available.'}
          </Text>
          <View style={tw`flex-row gap-3`}>
            {(selectedCategory !== 'all' || localSearch) && (
              <TouchableOpacity style={tw`bg-gray-200 rounded-xl py-3 px-4`} onPress={() => { setSelectedCategory('all'); setLocalSearch(''); }}>
                <Text style={tw`text-gray-700 text-center font-bold`}>Clear Filters</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={tw`bg-blue-500 rounded-xl py-3 px-4`} onPress={reloadMenu}>
              <Text style={tw`text-white text-center font-bold`}>Reload Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return (
      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-4 pb-20`}>
        <View style={tw`flex-row flex-wrap -mx-2`}>
          {filteredItems.map((item, index) => {
            const highlights = highlightMap.get(item.id);
            const nameHL = highlights?.find((h) => h.field === 'name');
            const catHL = highlights?.find((h) => h.field === 'categoryName');
            const catName = item.categoryName || (item as any).category?.name;

            return (
              <TouchableOpacity
                key={`menu-${item.id}-${index}`}
                style={[tw`p-2 ${!item.isAvailable ? 'opacity-50' : ''} ${productColumns}`]}
                onPress={() => item.isAvailable && isOpen && handleQuickAdd(item)}
                disabled={!item.isAvailable || !isOpen}
              >
                <View style={tw`bg-white rounded-xl p-3 border border-gray-100 relative overflow-hidden`}>
                  <View style={tw`mb-2`}>
                    <View style={[tw`w-full h-24 rounded-lg items-center justify-center`, { backgroundColor: '#f0f9ff' }]}>
                      <MaterialCommunityIcons name="food-variant" size={36} color="#3b82f6" />
                    </View>
                  </View>
                  <View>
                    <Text style={[tw`text-gray-900`, typography.bodySemibold]} numberOfLines={1}>
                      {nameHL
                        ? getHighlightSegments(item.name, nameHL.indices).map((seg, i) =>
                            seg.highlighted
                              ? <Text key={i} style={tw`text-blue-600 bg-blue-50`}>{seg.text}</Text>
                              : <Text key={i}>{seg.text}</Text>
                          )
                        : item.name}
                    </Text>
                    {catName && (
                      <Text style={tw`text-gray-500 text-xs`} numberOfLines={1}>
                        {catHL
                          ? getHighlightSegments(catName, catHL.indices).map((seg, i) =>
                              seg.highlighted
                                ? <Text key={i} style={tw`text-blue-600 bg-blue-50`}>{seg.text}</Text>
                                : <Text key={i}>{seg.text}</Text>
                            )
                          : catName}
                      </Text>
                    )}
                    <View style={tw`flex-row items-center justify-between mt-1.5`}>
                      <Text style={[tw`text-blue-600`, typography.bodySemibold]}>R{item.price?.toFixed(2)}</Text>
                      <View style={tw`w-6 h-6 rounded-full bg-blue-100 items-center justify-center`}>
                        <MaterialCommunityIcons name="plus" size={16} color="#2563eb" />
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderCart = () => (
    <View style={tw`flex-1`}>
      <View style={tw`p-4 bg-gray-50 border-b border-gray-100`}>
        <View style={tw`flex-row justify-between items-center mb-2`}>
          <Text style={[tw`text-gray-900`, typography.bodySemibold]}>Customer</Text>
          <TouchableOpacity style={tw`p-2 rounded-full bg-blue-50`} onPress={() => setShowCheckSheet(true)}>
            <MaterialCommunityIcons name="pencil" size={16} color="#3b82f6" />
          </TouchableOpacity>
        </View>
        <View style={tw`bg-white p-3 rounded-xl border border-gray-200`}>
          <View style={tw`flex-row items-center`}>
            <View style={tw`h-8 w-8 rounded-full ${guest ? 'bg-blue-100' : 'bg-gray-100'} items-center justify-center mr-2`}>
              {guest ? (
                <Text style={tw`text-blue-700 text-sm font-bold`}>{(guest.firstName || '?')[0].toUpperCase()}</Text>
              ) : (
                <MaterialCommunityIcons name="account" size={16} color="#3b82f6" />
              )}
            </View>
            <View style={tw`flex-1`}>
              {guest ? (
                <>
                  <View style={tw`flex-row items-center`}>
                    <Text style={[tw`text-gray-900`, typography.bodySemibold]}>
                      {guest.firstName} {guest.lastName || ''}
                    </Text>
                    {guest.isVIP && (
                      <View style={tw`bg-amber-100 rounded px-1.5 py-0.5 ml-2`}>
                        <Text style={tw`text-amber-700 text-[9px] font-bold`}>VIP</Text>
                      </View>
                    )}
                  </View>
                  <Text style={tw`text-gray-500 text-xs`}>
                    {check.tableName || 'N/A'} • {check.guestCount} guest{check.guestCount !== 1 ? 's' : ''}
                    {guest.tags?.length ? ` • ${guest.tags.join(', ')}` : ''}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[tw`text-gray-700`, typography.bodySemibold]}>
                    Table {check.tableName || check.tableId || 'N/A'}
                  </Text>
                  <Text style={tw`text-gray-500 text-xs`}>
                    {check.guestCount} guest{check.guestCount !== 1 ? 's' : ''} • {check.serverName || 'N/A'}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={tw`flex-1`}>
        {activeItems.length === 0 ? (
          <View style={tw`flex-1 justify-center items-center p-8`}>
            <MaterialCommunityIcons name="cart-outline" size={48} color="#9ca3af" />
            <Text style={tw`text-gray-500 mt-4 text-center`}>Your cart is empty. Add items to begin.</Text>
          </View>
        ) : (
          activeItems.map((item, idx) => (
            <View key={`cart-${item.id}-${idx}`} style={tw`flex-row items-center justify-between p-4 border-b border-gray-100`}>
              <View style={tw`flex-1`}>
                <Text style={[tw`text-gray-900`, typography.bodySemibold]}>{item.menuItemName}</Text>
                <View style={tw`flex-row items-center`}>
                  <Text style={tw`text-gray-500`}>R{item.totalPrice?.toFixed(2) || '0.00'}</Text>
                  {(item as any).firingStatus === 'FIRE' && item.status === 'PENDING' && (
                    <View style={tw`ml-2 px-1.5 py-0.5 rounded-full bg-orange-50`}>
                      <Text style={tw`text-orange-600 text-[10px]`}>SENT</Text>
                    </View>
                  )}
                  {(item as any).firingStatus === 'FIRE_HOLD' && (
                    <View style={tw`ml-2 px-1.5 py-0.5 rounded-full bg-yellow-50`}>
                      <Text style={tw`text-yellow-600 text-[10px]`}>NEW</Text>
                    </View>
                  )}
                  {item.status !== 'PENDING' && item.status !== 'VOIDED' && (
                    <View style={tw`ml-2 px-1.5 py-0.5 rounded-full bg-blue-50`}>
                      <Text style={tw`text-blue-600 text-[10px]`}>{item.status}</Text>
                    </View>
                  )}
                </View>
                {item.modifiers && item.modifiers.length > 0 && (
                  <Text style={tw`text-gray-400 text-xs mt-0.5`}>+ {item.modifiers.map((m) => m.modifierName).join(', ')}</Text>
                )}
                {item.specialRequests && (
                  <Text style={tw`text-orange-500 text-xs mt-0.5`}>{item.specialRequests}</Text>
                )}
              </View>
              <View style={tw`flex-row items-center`}>
                <View style={tw`w-8 h-8 bg-gray-100 rounded-full items-center justify-center`}>
                  <Text style={tw`text-gray-900`}>{item.quantity}</Text>
                </View>
                {isOpen && (
                  <TouchableOpacity
                    onPress={() => { setSelectedItem(item); setShowItemSheet(true); }}
                    style={tw`ml-3`}
                  >
                    <MaterialCommunityIcons name="dots-vertical" size={20} color="#6b7280" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={tw`p-4 bg-white border-t border-gray-100`}>
        <View style={tw`flex-row justify-between mb-2`}>
          <Text style={[tw`text-gray-600`, typography.bodySemibold]}>Subtotal</Text>
          <Text style={[tw`text-gray-900`, typography.bodySemibold]}>R{check.subtotal?.toFixed(2) || '0.00'}</Text>
        </View>
        {(check.discountAmount ?? 0) > 0 && (
          <View style={tw`flex-row justify-between mb-2`}>
            <Text style={tw`text-gray-600`}>Discount</Text>
            <Text style={tw`text-red-500`}>-R{check.discountAmount?.toFixed(2)}</Text>
          </View>
        )}
        <View style={tw`flex-row justify-between mb-2`}>
          <Text style={tw`text-gray-600`}>Tax (15%)</Text>
          <Text style={tw`text-gray-900`}>R{check.taxAmount?.toFixed(2) || '0.00'}</Text>
        </View>
        <View style={tw`flex-row justify-between mb-4 pt-2 border-t border-gray-100`}>
          <Text style={[tw`text-gray-900 text-lg`, typography.h2]}>Total</Text>
          <Text style={[tw`text-gray-900 text-lg`, typography.h2]}>R{check.totalAmount?.toFixed(2) || '0.00'}</Text>
        </View>

        {isOpen && (
          <View style={tw`gap-2`}>
            {unfiredItems.length > 0 && (
              <TouchableOpacity 
                style={tw`bg-orange-500 p-3 rounded-xl flex-row items-center justify-center ${isFiring ? 'opacity-70' : ''}`} 
                onPress={handleFire}
                disabled={isFiring}
              >
                {isFiring ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <MaterialCommunityIcons name="fire" size={18} color="white" />
                )}
                <Text style={tw`text-white font-bold ml-2`}>
                  {isFiring ? 'Sending...' : `Fire to Kitchen (${unfiredItems.length})`}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={tw`bg-blue-600 p-4 rounded-xl ${activeItems.length === 0 ? 'opacity-50' : ''}`}
              onPress={() => activeItems.length > 0 && setShowPaymentModal(true)}
              disabled={activeItems.length === 0}
            >
              <Text style={tw`text-white text-center font-bold`}>Process Payment</Text>
            </TouchableOpacity>
          </View>
        )}

        {check.status === 'CLOSED' && (check.balanceDue ?? 0) > 0 && (
          <TouchableOpacity style={tw`bg-blue-600 p-4 rounded-xl`} onPress={() => setShowPaymentModal(true)}>
            <Text style={tw`text-white text-center font-bold`}>Pay Balance (R{check.balanceDue?.toFixed(2)})</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw`flex-1 bg-gray-50`}>
      <SafeAreaView style={tw`flex-1`}>
        <View style={tw`flex-1 flex-row`}>
          {/* LEFT: Product / Menu Grid */}
          <View style={tw`flex-1`}>
            <View style={tw`flex-row items-center bg-white p-4 border-b border-gray-100`}>
              <TouchableOpacity onPress={() => router.back()} style={tw`mr-3 p-2 bg-gray-100 rounded-full`}>
                <MaterialCommunityIcons name="arrow-left" size={20} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`flex-1 flex-row items-center bg-gray-50 rounded-xl px-4 py-2`}
                activeOpacity={0.7}
                onPress={() => searchInputRef.current?.focus()}
              >
                <MaterialCommunityIcons name="magnify" size={20} color="#6b7280" />
                <TextInput
                  ref={searchInputRef}
                  style={tw`flex-1 ml-2 text-gray-900 py-2`}
                  placeholder="Search menu items..."
                  placeholderTextColor="#9ca3af"
                  value={localSearch}
                  onChangeText={setLocalSearch}
                />
                {localSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setLocalSearch('')} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <MaterialCommunityIcons name="close" size={20} color="#6b7280" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            <View style={tw`h-14 bg-white border-b border-gray-100`}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`px-4`} contentContainerStyle={tw`h-14 items-center`}>
                {categories.map((cat, idx) => (
                  <TouchableOpacity
                    key={`cat-${cat.id}-${idx}`}
                    style={tw`mr-2 px-4 py-2 rounded-full ${selectedCategory === cat.id ? 'bg-blue-600' : 'bg-gray-100'}`}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <View style={tw`flex-row items-center`}>
                      <MaterialCommunityIcons name={cat.icon as any} size={20} color={selectedCategory === cat.id ? '#fff' : '#6b7280'} />
                      <Text style={tw`ml-2 ${selectedCategory === cat.id ? 'text-white' : 'text-gray-700'}`}>{cat.name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {renderProductGrid()}
          </View>

          {/* RIGHT: Cart — always visible on POS screen */}
          <View style={[tw`bg-white border-l border-gray-100`, { width: Math.max(width * 0.33, 320) }]}>
            <View style={tw`p-4 border-b border-gray-100`}>
              <Text style={[tw`text-gray-900 text-xl`, typography.h2]}>Cart</Text>
            </View>
            {renderCart()}
          </View>
        </View>

        {/* Action sheets */}
        <ItemActionSheet
          visible={showItemSheet}
          item={selectedItem}
          onClose={() => { setShowItemSheet(false); setSelectedItem(null); }}
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

        <HospitalityPaymentSheet
          visible={showPaymentModal}
          checkId={check.id}
          onClose={() => { setShowPaymentModal(false); load(); }}
          onComplete={() => { setShowPaymentModal(false); load(); router.back(); }}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
