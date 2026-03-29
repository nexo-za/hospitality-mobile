import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';

export interface TableDisplayProperties {
  amount: boolean;
  diningTime: boolean;
  waiter: boolean;
  customers: boolean;
  items: boolean;
}

// Ensure we have flexible typing to handle dynamic API shapes
interface TableNodeProps {
  table: any; // Using any here temporarily to allow capacity, checks, etc.
  isMyTable: boolean;
  onPress: (table: any) => void;
  elapsedMinutes: number | null;
  displayProperties: TableDisplayProperties;
  zoomScale?: number;
}

interface StatusStyle {
  bg: string;
  border: string;
  borderColorHex: string;
  textColor: string;
  iconColor: string;
}

function getStatusStyle(tableStatus: string, checkStatus?: string, elapsedMinutes?: number | null): StatusStyle {
  if (checkStatus === 'OPEN' || tableStatus === 'OCCUPIED' || tableStatus === 'OPEN') {
    if (elapsedMinutes != null) {
      if (elapsedMinutes >= 60) {
        // Critical Wait (> 60 mins)
        return { bg: 'bg-red-50', border: 'border-red-400', borderColorHex: '#f87171', textColor: '#b91c1c', iconColor: '#ef4444' };
      }
      if (elapsedMinutes >= 30) {
        // Warning Wait (30-60 mins)
        return { bg: 'bg-orange-50', border: 'border-orange-400', borderColorHex: '#fb923c', textColor: '#c2410c', iconColor: '#f97316' };
      }
    }
    // Normal Occupied
    return { bg: 'bg-emerald-50', border: 'border-emerald-400', borderColorHex: '#34d399', textColor: '#047857', iconColor: '#10b981' };
  }
  
  if (checkStatus === 'PRINTED' || checkStatus === 'PARTIALLY_PAID') {
    // Bill printed or partially paid
    return { bg: 'bg-blue-50', border: 'border-blue-400', borderColorHex: '#60a5fa', textColor: '#1d4ed8', iconColor: '#3b82f6' };
  }

  switch (tableStatus) {
    case 'RESERVED':
      return { bg: 'bg-purple-50', border: 'border-purple-300', borderColorHex: '#d8b4fe', textColor: '#6d28d9', iconColor: '#8b5cf6' };
    case 'DIRTY':
    case 'CLEANING':
      return { bg: 'bg-amber-50', border: 'border-amber-300', borderColorHex: '#fcd34d', textColor: '#b45309', iconColor: '#eab308' };
    case 'BLOCKED':
      return { bg: 'bg-gray-100', border: 'border-gray-300', borderColorHex: '#d1d5db', textColor: '#4b5563', iconColor: '#9ca3af' };
    default:
      // AVAILABLE
      return { bg: 'bg-white', border: 'border-gray-200', borderColorHex: '#e5e7eb', textColor: '#374151', iconColor: '#9ca3af' };
  }
}

function isRoundShape(shape?: string): boolean {
  return shape === 'ROUND' || shape === 'OVAL';
}

function formatAmount(amount?: number): string {
  if (amount == null) return '--';
  return `${amount.toFixed(2)}€`;
}

function formatDuration(elapsedMinutes: number | null): string {
  if (elapsedMinutes == null || elapsedMinutes < 0) return '--';
  const hours = Math.floor(elapsedMinutes / 60);
  const mins = elapsedMinutes % 60;
  return `${hours}:${String(mins).padStart(2, '0')}h`;
}

function getTableLayout(capacity: number, shape?: string, zoomScale: number = 1) {
  let w = 110;
  let h = 110;
  let dist = { left: 0, right: 0, top: 0, bottom: 0 };

  if (capacity <= 1) {
    w = 90; h = 90;
    dist = { left: 0, right: 0, top: 1, bottom: 0 };
  } else if (capacity === 2) {
    w = 100; h = 100;
    dist = { left: 1, right: 1, top: 0, bottom: 0 };
  } else if (capacity === 3) {
    w = 110; h = 110;
    dist = { left: 1, right: 1, top: 1, bottom: 0 };
  } else if (capacity === 4) {
    w = 120; h = 120;
    dist = { left: 1, right: 1, top: 1, bottom: 1 };
  } else {
    // 5+
    const sides = 2; // 1 left, 1 right
    const topBottom = capacity - sides;
    const top = Math.ceil(topBottom / 2);
    const bottom = Math.floor(topBottom / 2);
    
    // Provide enough space for top chairs
    w = Math.max(140, top * 50 + 40); 
    h = 120;
    dist = { left: 1, right: 1, top, bottom };
  }

  return {
    width: w * zoomScale,
    height: h * zoomScale,
    dist
  };
}

export function TableNode({
  table,
  isMyTable,
  onPress,
  onLongPress,
  elapsedMinutes,
  displayProperties,
  zoomScale = 1,
}: TableNodeProps & { onLongPress?: (table: any) => void }) {
  const activeCheck = table.checks?.[0] || table.activeCheck;
  const capacity = table.capacity ?? table.seats ?? 4;
  const guestCount = activeCheck?.guestCount ?? 0;
  const showDetails = !!activeCheck || table.status === 'OCCUPIED' || table.status === 'RESERVED';

  const statusStyle = useMemo(
    () => getStatusStyle(table.status, activeCheck?.status, elapsedMinutes),
    [table.status, activeCheck?.status, elapsedMinutes],
  );

  const round = isRoundShape(table.shape);
  const layout = useMemo(() => getTableLayout(capacity, table.shape, zoomScale), [capacity, table.shape, zoomScale]);
  
  // Use API width/height if present, but DO NOT go smaller than our dynamic layout needs
  const minW = layout.width;
  const minH = layout.height;
  const width = table.width ? Math.max(table.width * zoomScale, minW) : minW;
  const height = table.height ? Math.max(table.height * zoomScale, minH) : minH;

  const hasPosition = table.positionX != null && table.positionY != null;
  const posX = table.positionX ?? table.posX;
  const posY = table.positionY ?? table.posY;
  const hasValidPosition = posX != null && posY != null;

  const fontScale = Math.max(0.85, Math.min(zoomScale, 1.15));
  
  // Track how many occupied chairs we have painted
  let chairsOccupied = guestCount;

  const containerStyle = useMemo(
    () => [
      tw`border ${statusStyle.bg} ${statusStyle.border} items-center justify-center`,
      {
        width,
        height,
        borderRadius: round ? Math.max(width, height) / 2 : 20 * zoomScale,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
        ...(hasValidPosition && {
          position: 'absolute' as const,
          left: posX * zoomScale,
          top: posY * zoomScale,
        }),
        ...(isMyTable && {
          borderWidth: 2,
          borderColor: '#4f46e5',
        }),
      },
    ],
    [width, height, round, hasValidPosition, posX, posY, zoomScale, isMyTable, statusStyle],
  );

  const dist = layout.dist;

  const renderChairGroup = (side: 'left' | 'right' | 'top' | 'bottom', count: number) => {
    if (count === 0) return null;
    const isVertical = side === 'left' || side === 'right';
    const chairThickness = 12 * zoomScale;
    const chairLength = 48 * zoomScale;
    const offset = -chairThickness; 
    
    // We want the container to stretch along the edge to distribute chairs
    let positionStyle: any = {};
    const padding = 16 * zoomScale;
    if (side === 'left') positionStyle = { left: offset, top: padding, bottom: padding, width: chairThickness };
    if (side === 'right') positionStyle = { right: offset, top: padding, bottom: padding, width: chairThickness };
    if (side === 'top') positionStyle = { top: offset, left: padding, right: padding, height: chairThickness, flexDirection: 'row' };
    if (side === 'bottom') positionStyle = { bottom: offset, left: padding, right: padding, height: chairThickness, flexDirection: 'row' };

    return (
      <View style={[tw`absolute justify-evenly items-center`, positionStyle]}>
        {Array.from({ length: count }).map((_, i) => {
          const isOccupied = chairsOccupied > 0;
          if (isOccupied) chairsOccupied--;
          
          return (
            <View
              key={i}
              style={[
                tw`border`,
                {
                  width: isVertical ? chairThickness : chairLength,
                  height: isVertical ? chairLength : chairThickness,
                  borderRadius: 100,
                  backgroundColor: isOccupied ? statusStyle.iconColor : '#ffffff',
                  borderColor: isOccupied ? statusStyle.iconColor : statusStyle.borderColorHex,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 3,
                  elevation: 2,
                }
              ]}
            />
          );
        })}
      </View>
    );
  };

  const amountToShow = activeCheck?.balanceDue ?? activeCheck?.grandTotal;

  return (
    <Pressable
      onPress={() => onPress(table)}
      onLongPress={onLongPress ? () => onLongPress(table) : undefined}
      style={({ pressed }) => [
        containerStyle,
        pressed && { opacity: 0.75 },
      ]}
      accessibilityLabel={`Table ${table.name || table.label}, ${table.status}`}
      accessibilityRole="button"
    >
      {/* Chairs */}
      {renderChairGroup('left', dist.left)}
      {renderChairGroup('right', dist.right)}
      {renderChairGroup('top', dist.top)}
      {renderChairGroup('bottom', dist.bottom)}

      <View style={tw`flex-1 px-2 py-1.5 justify-center items-center`}>
        <Text
          variant="semibold"
          style={[
            typography.bodySemibold,
            { color: statusStyle.textColor, fontSize: 13 * fontScale, textAlign: 'center' },
          ]}
          numberOfLines={1}
        >
          {table.label || table.name || table.number || `T${table.tableNumber}`}
        </Text>

        {showDetails && displayProperties.amount && amountToShow != null && (
          <View style={tw`flex-row items-center justify-center mt-1`}>
            <MaterialCommunityIcons name="currency-usd" size={12 * fontScale} color={statusStyle.iconColor} style={tw`opacity-80`} />
            <Text
              variant="medium"
              style={[typography.small, { color: statusStyle.textColor, marginLeft: 2, fontSize: 11 * fontScale }]}
              numberOfLines={1}
            >
              {formatAmount(amountToShow)}
            </Text>
          </View>
        )}

        {showDetails && displayProperties.diningTime && (
          <View style={tw`flex-row items-center justify-center mt-0.5`}>
            <MaterialCommunityIcons name="clock-outline" size={12 * fontScale} color={statusStyle.iconColor} style={tw`opacity-80`} />
            <Text
              variant="medium"
              style={[typography.small, { color: statusStyle.textColor, marginLeft: 2, fontSize: 11 * fontScale }]}
              numberOfLines={1}
            >
              {formatDuration(elapsedMinutes)}
            </Text>
          </View>
        )}

        {showDetails && displayProperties.customers && (
          <View style={tw`flex-row items-center justify-center mt-0.5`}>
            <MaterialCommunityIcons name="account-group-outline" size={12 * fontScale} color={statusStyle.iconColor} style={tw`opacity-80`} />
            <Text
              variant="medium"
              style={[typography.small, { color: statusStyle.textColor, marginLeft: 2, fontSize: 11 * fontScale }]}
              numberOfLines={1}
            >
              {guestCount || capacity}
            </Text>
          </View>
        )}

        {showDetails && displayProperties.waiter && (
          <Text
            variant="regular"
            style={[
              typography.small,
              {
                color: statusStyle.textColor,
                textAlign: 'center',
                marginTop: 2,
                fontSize: 10 * fontScale,
                opacity: 0.8,
              },
            ]}
            numberOfLines={1}
          >
            {activeCheck?.server?.firstName ?? activeCheck?.serverName ?? 'Unassigned'}
          </Text>
        )}

        {showDetails && displayProperties.items && (
          <View style={tw`flex-row items-center justify-center mt-0.5`}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={12 * fontScale} color={statusStyle.iconColor} style={tw`opacity-80`} />
            <Text
              variant="medium"
              style={[typography.small, { color: statusStyle.textColor, marginLeft: 2, fontSize: 11 * fontScale }]}
              numberOfLines={1}
            >
              {activeCheck?._count?.items ?? activeCheck?.itemCount ?? 0}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

