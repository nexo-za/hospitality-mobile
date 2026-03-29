import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { TableNode, type TableDisplayProperties } from './TableNode';
import type {
  Table,
  FloorPlan,
  FloorSection,
  ServerAssignment,
} from '@/types/hospitality';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FloorPlanViewProps {
  tables: Table[];
  floorPlans: FloorPlan[];
  sections: FloorSection[];
  assignments: ServerAssignment[];
  activeFloorPlan: FloorPlan | null;
  onFloorPlanChange: (floorPlanId: number) => void;
  onTablePress: (table: Table) => void;
  onTableLongPress?: (table: Table) => void;
  currentUserId: number;
  isLoading: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

const CANVAS_PADDING = 120;
const GRID_COLUMNS = 3;
const GRID_GAP = 28;
const ALL_SECTIONS_ID = -1;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.6;
const ZOOM_STEP = 0.1;
const DISPLAY_PROPS_KEY = 'tables_display_properties';

const DEFAULT_DISPLAY_PROPERTIES: TableDisplayProperties = {
  amount: true,
  diningTime: true,
  waiter: false,
  customers: true,
  items: false,
};

function computeElapsedMinutes(checkOpenedAt?: string | null): number | null {
  if (!checkOpenedAt) return null;
  const opened = new Date(checkOpenedAt).getTime();
  if (Number.isNaN(opened)) return null;
  return Math.floor((Date.now() - opened) / 60_000);
}

function hasAbsolutePositions(tables: Table[]): boolean {
  return tables.some((t) => t.positionX != null && t.positionY != null);
}

export function FloorPlanView({
  tables,
  floorPlans,
  sections,
  assignments,
  activeFloorPlan,
  onFloorPlanChange,
  onTablePress,
  onTableLongPress,
  currentUserId,
  isLoading,
  refreshing = false,
  onRefresh,
}: FloorPlanViewProps) {
  const [activeSectionId, setActiveSectionId] = useState<number>(ALL_SECTIONS_ID);
  const [zoomScale, setZoomScale] = useState<number>(1.8);
  const [showProperties, setShowProperties] = useState(false);
  const [showFloorPlans, setShowFloorPlans] = useState(false);
  const [displayProperties, setDisplayProperties] = useState<TableDisplayProperties>(
    DEFAULT_DISPLAY_PROPERTIES,
  );

  useEffect(() => {
    const loadDisplayProperties = async () => {
      try {
        const saved = await AsyncStorage.getItem(DISPLAY_PROPS_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved) as Partial<TableDisplayProperties>;
        setDisplayProperties({ ...DEFAULT_DISPLAY_PROPERTIES, ...parsed });
      } catch {
        // keep defaults if parse/storage fails
      }
    };
    loadDisplayProperties();
  }, []);

  const mySectionIds = useMemo(() => {
    const ids = new Set<number>();
    for (const a of assignments) {
      if (a.userId === currentUserId) ids.add(a.sectionId);
    }
    return ids;
  }, [assignments, currentUserId]);

  const filteredTables = useMemo(() => {
    const sectionIds = new Set(sections.map((section) => section.id));
    const visibleFloorTables = sectionIds.size > 0
      ? tables.filter((table) => sectionIds.has(table.sectionId))
      : tables;
    if (activeSectionId === ALL_SECTIONS_ID) return visibleFloorTables;
    return visibleFloorTables.filter((t) => t.sectionId === activeSectionId);
  }, [tables, sections, activeSectionId]);

  const tablesBySection = useMemo(() => {
    // Group by section and sort sections by their displayOrder
    const sortedSections = [...sections].sort((a, b) => a.displayOrder - b.displayOrder);
    const grouped = new Map<number, Table[]>();
    
    // Pre-populate with sorted sections to maintain order
    sortedSections.forEach(s => grouped.set(s.id, []));

    for (const table of filteredTables) {
      if (!grouped.has(table.sectionId)) {
        grouped.set(table.sectionId, []);
      }
      grouped.get(table.sectionId)!.push(table);
    }

    // Clean up empty sections
    for (const [id, sectionTables] of grouped.entries()) {
      if (sectionTables.length === 0) {
        grouped.delete(id);
      }
    }

    return grouped;
  }, [filteredTables, sections]);

  const useAbsoluteLayout = useMemo(
    () => hasAbsolutePositions(filteredTables),
    [filteredTables],
  );

  const canvasSize = useMemo(() => {
    if (!useAbsoluteLayout) return { width: 0, height: 0 };
    let maxX = 0;
    let maxY = 0;
    for (const t of filteredTables) {
      const right = ((t.positionX ?? 0) + (t.width ?? 120)) * zoomScale;
      const bottom = ((t.positionY ?? 0) + (t.height ?? 120)) * zoomScale;
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    }
    return {
      width: Math.max(maxX + CANVAS_PADDING, activeFloorPlan?.width ?? 0),
      height: Math.max(maxY + CANVAS_PADDING, activeFloorPlan?.height ?? 0),
    };
  }, [filteredTables, useAbsoluteLayout, activeFloorPlan, zoomScale]);

  const handleSectionPress = useCallback((sectionId: number) => {
    setActiveSectionId(sectionId);
  }, []);

  const handlePropertyToggle = useCallback(async (key: keyof TableDisplayProperties) => {
    setDisplayProperties((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(DISPLAY_PROPS_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const increaseZoom = useCallback(() => {
    setZoomScale((prev) => Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(2))));
  }, []);

  const decreaseZoom = useCallback(() => {
    setZoomScale((prev) => Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(2))));
  }, []);

  const scaleToFit = useCallback(() => {
    setZoomScale(1);
  }, []);

  if (isLoading) {
    return (
      <ScrollView
        contentContainerStyle={tw`flex-1 items-center justify-center`}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        <ActivityIndicator size="large" color="#6366f1" />
        <Text variant="medium" style={[typography.caption, tw`mt-3 text-gray-500`]}>
          Loading floor plan…
        </Text>
      </ScrollView>
    );
  }

  if (tables.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={tw`flex-1 items-center justify-center px-6`}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        <MaterialCommunityIcons name="table-furniture" size={48} color="#9ca3af" />
        <Text variant="medium" style={[typography.body, tw`mt-3 text-gray-500 text-center`]}>
          No tables configured for this floor plan.
        </Text>
      </ScrollView>
    );
  }

  const activePropertiesCount = Object.values(displayProperties).filter(Boolean).length;

  return (
    <View style={tw`flex-1`}>
      {/* Top Bar */}
      <View style={tw`px-6 py-4 flex-row items-center justify-between z-10`}>
        <Text variant="bold" style={[typography.h2, tw`text-gray-900`]}>
          {activeFloorPlan?.name ?? 'Dine in'}
        </Text>
        
        <View style={tw`flex-row items-center gap-3`}>
          <TouchableOpacity
            onPress={() => setShowProperties(true)}
            style={tw`flex-row items-center bg-white px-3 py-2 rounded-full shadow-sm border border-gray-200`}
          >
            <MaterialCommunityIcons name="tune-variant" size={16} color="#4b5563" />
            <Text variant="medium" style={[typography.captionMedium, tw`text-gray-700 ml-1.5`]}>Properties</Text>
            {activePropertiesCount > 0 && (
              <View style={tw`bg-gray-100 rounded-full w-5 h-5 items-center justify-center ml-1.5`}>
                <Text style={[typography.small, tw`text-gray-600`]}>{activePropertiesCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => console.log('[API RESPONSE_SUCCESS] More options clicked')}
            style={tw`w-9 h-9 bg-white rounded-full items-center justify-center shadow-sm border border-gray-200`}>
            <MaterialCommunityIcons name="dots-vertical" size={20} color="#4b5563" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setShowFloorPlans(true)}
            style={tw`flex-row items-center bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200`}>
            <MaterialCommunityIcons name="view-grid-outline" size={16} color="#4b5563" />
            <Text variant="medium" style={[typography.captionMedium, tw`text-gray-700 ml-1.5`]}>Floorplan</Text>
            <MaterialCommunityIcons name="chevron-down" size={16} color="#9ca3af" style={tw`ml-1`} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => console.log('[API RESPONSE_SUCCESS] Search clicked')}
            style={tw`w-9 h-9 bg-white rounded-full items-center justify-center shadow-sm border border-gray-200`}>
            <MaterialCommunityIcons name="magnify" size={20} color="#4b5563" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Canvas Area */}
      <View style={tw`flex-1 relative`}>
        {useAbsoluteLayout ? (
          <ScrollView
            horizontal
            contentContainerStyle={{ minWidth: canvasSize.width }}
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
          >
            <ScrollView
              contentContainerStyle={{
                minHeight: canvasSize.height,
                width: canvasSize.width,
              }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              refreshControl={
                onRefresh ? (
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                ) : undefined
              }
            >
              <View style={{ width: canvasSize.width, height: canvasSize.height }}>
                {filteredTables.map((table) => (
                <TableNode
                  key={table.id}
                  table={table}
                  isMyTable={mySectionIds.has(table.sectionId)}
                  onPress={onTablePress}
                  onLongPress={onTableLongPress}
                  elapsedMinutes={computeElapsedMinutes(table.checks?.[0]?.openedAt || table.activeCheck?.openedAt || table.checkOpenedAt)}
                  displayProperties={displayProperties}
                  zoomScale={zoomScale}
                />
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={tw`px-6 pt-4 pb-24`}
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              ) : undefined
            }
          >
            {Array.from(tablesBySection.entries()).map(([sectionId, sectionTables]) => {
              const sectionName = sections.find((s) => s.id === sectionId)?.name || 'Other Tables';
              return (
                <View key={sectionId} style={tw`mb-8`}>
                  {activeSectionId === ALL_SECTIONS_ID && (
                    <Text variant="bold" style={[typography.h3, tw`text-gray-800 mb-4 ml-2`]}>
                      {sectionName}
                    </Text>
                  )}
                  <View style={tw`flex-row flex-wrap`}>
                    {sectionTables.filter((t: any) => (t.capacity ?? t.seats ?? 4) <= 4).map((table) => {
                      const scaledGap = GRID_GAP * zoomScale;
                      return (
                        <View
                          key={table.id}
                          style={{
                            width: `${100 / GRID_COLUMNS}%` as unknown as number,
                            padding: scaledGap / 2,
                            alignItems: 'center',
                            marginBottom: scaledGap,
                          }}
                        >
                          <TableNode
                            table={table}
                            isMyTable={mySectionIds.has(table.sectionId)}
                            onPress={onTablePress}
                            onLongPress={onTableLongPress}
                            elapsedMinutes={computeElapsedMinutes(
                              table.checks?.[0]?.openedAt || table.activeCheck?.openedAt || table.checkOpenedAt
                            )}
                            displayProperties={displayProperties}
                            zoomScale={zoomScale}
                          />
                        </View>
                      );
                    })}
                  </View>
                  {/* Large tables (5+ seats) in a separate 2-column grid */}
                  {sectionTables.some((t: any) => (t.capacity ?? t.seats ?? 4) > 4) && (
                    <View style={tw`flex-row flex-wrap`}>
                      {sectionTables.filter((t: any) => (t.capacity ?? t.seats ?? 4) > 4).map((table) => {
                        const scaledGap = GRID_GAP * zoomScale;
                        return (
                          <View
                            key={table.id}
                            style={{
                              width: '50%' as unknown as number,
                              padding: scaledGap / 2,
                              alignItems: 'center',
                              marginBottom: scaledGap,
                            }}
                          >
                            <TableNode
                              table={table}
                              isMyTable={mySectionIds.has(table.sectionId)}
                              onPress={onTablePress}
                              onLongPress={onTableLongPress}
                              elapsedMinutes={computeElapsedMinutes(
                                table.checks?.[0]?.openedAt || table.activeCheck?.openedAt || table.checkOpenedAt
                              )}
                              displayProperties={displayProperties}
                              zoomScale={zoomScale}
                            />
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Floating Zoom Controls (Bottom Left) */}
        <View style={tw`absolute bottom-6 left-6 flex-col gap-3 pointer-events-box-none`}>
          <View style={tw`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden w-10 pointer-events-auto`}>
            <TouchableOpacity onPress={increaseZoom} style={tw`p-2.5 border-b border-gray-100 items-center justify-center`}>
              <MaterialCommunityIcons name="plus" size={20} color="#4b5563" />
            </TouchableOpacity>
            <TouchableOpacity onPress={decreaseZoom} style={tw`p-2.5 items-center justify-center`}>
              <MaterialCommunityIcons name="minus" size={20} color="#4b5563" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={scaleToFit} style={tw`bg-white rounded-full shadow-sm border border-gray-200 px-4 py-2.5 flex-row items-center gap-2 pointer-events-auto`}>
            <MaterialCommunityIcons name="target" size={18} color="#4b5563" />
            <Text variant="medium" style={[typography.captionMedium, tw`text-gray-700`]}>Scaled to fit</Text>
          </TouchableOpacity>
        </View>

        {/* Floating Section Tabs (Bottom Center) */}
        {sections.length > 1 && (
          <View style={tw`absolute bottom-6 left-0 right-0 items-center justify-center pointer-events-box-none px-12 z-20`}>
            <View style={tw`bg-white rounded-full shadow-sm border border-gray-200 p-1 pointer-events-auto`}>
              <SectionTabs
                sections={sections}
                activeSectionId={activeSectionId}
                onPress={handleSectionPress}
              />
            </View>
          </View>
        )}
      </View>

      <DisplayPropertiesModal
        visible={showProperties}
        properties={displayProperties}
        onClose={() => setShowProperties(false)}
        onToggle={handlePropertyToggle}
      />

      <FloorPlansModal
        visible={showFloorPlans}
        floorPlans={floorPlans}
        activeFloorPlanId={activeFloorPlan?.id}
        onClose={() => setShowFloorPlans(false)}
        onSelect={(id) => {
          onFloorPlanChange(id);
          setShowFloorPlans(false);
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Floor Plans Modal
// ---------------------------------------------------------------------------

interface FloorPlansModalProps {
  visible: boolean;
  floorPlans: FloorPlan[];
  activeFloorPlanId?: number;
  onClose: () => void;
  onSelect: (id: number) => void;
}

function FloorPlansModal({
  visible,
  floorPlans,
  activeFloorPlanId,
  onClose,
  onSelect,
}: FloorPlansModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={tw`flex-1 bg-black/20 justify-center items-center px-4`} onPress={onClose}>
        <Pressable style={tw`bg-white rounded-3xl w-full max-w-xs p-5 shadow-xl`} onPress={() => undefined}>
          <View style={tw`flex-row items-center mb-4`}>
            <MaterialCommunityIcons name="view-grid-outline" size={20} color="#374151" />
            <Text variant="semibold" style={[typography.bodySemibold, tw`text-gray-800 ml-2`]}>
              Select Floorplan
            </Text>
          </View>
          <View style={tw`flex-col gap-2`}>
            {floorPlans.map((fp) => {
              const isActive = fp.id === activeFloorPlanId;
              return (
                <TouchableOpacity
                  key={fp.id}
                  style={[
                    tw`flex-row items-center px-4 py-3 rounded-xl border`,
                    isActive ? tw`bg-blue-50 border-blue-200` : tw`bg-white border-gray-100`
                  ]}
                  onPress={() => onSelect(fp.id)}
                >
                  <Text
                    variant={isActive ? 'semibold' : 'medium'}
                    style={[
                      typography.body,
                      { color: isActive ? '#1e40af' : '#374151' }
                    ]}
                  >
                    {fp.name}
                  </Text>
                  {isActive && (
                    <MaterialCommunityIcons name="check" size={18} color="#2563eb" style={tw`ml-auto`} />
                  )}
                </TouchableOpacity>
              );
            })}
            {floorPlans.length === 0 && (
              <Text style={[typography.body, tw`text-gray-500 text-center py-4`]}>
                No other floorplans available
              </Text>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Section Tabs
// ---------------------------------------------------------------------------

interface SectionTabsProps {
  sections: FloorSection[];
  activeSectionId: number;
  onPress: (sectionId: number) => void;
}

function SectionTabs({ sections, activeSectionId, onPress }: SectionTabsProps) {
  const sorted = useMemo(
    () => [...sections].sort((a, b) => a.displayOrder - b.displayOrder),
    [sections],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw`flex-row items-center`}
    >
      <TabPill
        label="All"
        isActive={activeSectionId === ALL_SECTIONS_ID}
        onPress={() => onPress(ALL_SECTIONS_ID)}
      />
      {sorted.map((section) => (
        <TabPill
          key={section.id}
          label={section.name}
          isActive={activeSectionId === section.id}
          onPress={() => onPress(section.id)}
        />
      ))}
    </ScrollView>
  );
}

interface TabPillProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function TabPill({ label, isActive, onPress }: TabPillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        tw`px-5 py-2 rounded-full`,
        isActive ? tw`bg-gray-800` : tw`bg-transparent`,
      ]}
    >
      <Text
        variant="medium"
        style={[
          typography.captionMedium,
          { color: isActive ? '#ffffff' : '#4b5563' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Display Properties Modal
// ---------------------------------------------------------------------------

interface DisplayPropertiesModalProps {
  visible: boolean;
  properties: TableDisplayProperties;
  onClose: () => void;
  onToggle: (key: keyof TableDisplayProperties) => void;
}

function DisplayPropertiesModal({
  visible,
  properties,
  onClose,
  onToggle,
}: DisplayPropertiesModalProps) {
  const options: { key: keyof TableDisplayProperties; label: string; icon: string }[] = [
    { key: 'diningTime', label: 'Dining time', icon: 'clock-outline' },
    { key: 'waiter', label: 'Waiter', icon: 'account-outline' },
    { key: 'amount', label: 'Amount', icon: 'currency-usd' },
    { key: 'customers', label: 'Customers', icon: 'account-group-outline' },
    { key: 'items', label: 'Items', icon: 'silverware-fork-knife' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={tw`flex-1 bg-black/20 justify-center items-center px-4`} onPress={onClose}>
        <Pressable style={tw`bg-white rounded-3xl w-full max-w-xs p-5 shadow-xl`} onPress={() => undefined}>
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <View style={tw`flex-row items-center`}>
              <MaterialCommunityIcons name="tune-variant" size={20} color="#374151" />
              <Text variant="semibold" style={[typography.bodySemibold, tw`text-gray-800 ml-2`]}>
                Properties
              </Text>
            </View>
            <TouchableOpacity onPress={() => {
              // Clear all
              Object.keys(properties).forEach(k => {
                if (properties[k as keyof TableDisplayProperties]) {
                  onToggle(k as keyof TableDisplayProperties);
                }
              });
            }}>
              <Text style={[typography.captionMedium, tw`text-red-500`]}>Clear</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[typography.small, tw`text-gray-500 mb-3`]}>Select up to 2</Text>

          <View style={tw`flex-row flex-wrap gap-2`}>
            {options.map((option) => {
              const isActive = properties[option.key];
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    tw`flex-row items-center px-3 py-2 rounded-xl border`,
                    isActive ? tw`bg-gray-800 border-gray-800` : tw`bg-gray-50 border-gray-200`
                  ]}
                  onPress={() => onToggle(option.key)}
                >
                  <MaterialCommunityIcons 
                    name={option.icon as never} 
                    size={16} 
                    color={isActive ? '#ffffff' : '#9ca3af'} 
                  />
                  <Text 
                    variant="medium" 
                    style={[
                      typography.captionMedium, 
                      tw`ml-1.5`,
                      { color: isActive ? '#ffffff' : '#9ca3af' }
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
