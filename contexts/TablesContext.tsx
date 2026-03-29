import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import tablesService from '@/api/services/tablesService';
import type {
  Table,
  TableStatus,
  FloorPlan,
  FloorSection,
  ServerAssignment,
  TableCombination,
} from '@/types/hospitality';
import { useAuth } from './AuthContext';

interface TablesContextType {
  tables: Table[];
  floorPlans: FloorPlan[];
  activeFloorPlan: FloorPlan | null;
  sections: FloorSection[];
  assignments: ServerAssignment[];
  combinations: TableCombination[];
  isLoading: boolean;
  error: string | null;
  setActiveFloorPlan: (plan: FloorPlan | null) => void;
  switchFloorPlan: (floorPlanId: number) => Promise<void>;
  refreshFloorPlans: (storeId?: number) => Promise<void>;
  refreshTables: (storeId?: number) => Promise<void>;
  refreshAssignments: (shiftId?: number, storeId?: number) => Promise<void>;
  updateTableStatus: (id: number, status: TableStatus) => Promise<void>;
  assignServer: (
    shiftId: number,
    userId: number,
    sectionId: number,
    storeId: number
  ) => Promise<void>;
  unassignServer: (id: number) => Promise<void>;
  combineTables: (tableIds: number[], name?: string) => Promise<void>;
  uncombineTables: (id: number) => Promise<void>;
  getTableById: (id: number) => Table | undefined;
  myTables: Table[];
}

const TablesContext = createContext<TablesContextType | undefined>(undefined);

function extractArray<T>(res: any): T[] {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray((res as any)?.data?.data)) return (res as any).data.data;
  if (Array.isArray(res)) return res;
  return [];
}

export const TablesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [activeFloorPlan, setActiveFloorPlanState] = useState<FloorPlan | null>(null);
  const [sections, setSections] = useState<FloorSection[]>([]);
  const [assignments, setAssignments] = useState<ServerAssignment[]>([]);
  const [combinations, setCombinations] = useState<TableCombination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tablesRef = useRef<Map<number, Table>>(new Map());
  const activeFloorPlanRef = useRef<FloorPlan | null>(null);
  const floorPlansRef = useRef<FloorPlan[]>([]);
  const userRef = useRef(user);
  userRef.current = user;

  const loadSectionsForPlan = useCallback(async (plan: FloorPlan | null) => {
    if (!plan) {
      setSections([]);
      return;
    }
    if (Array.isArray(plan.sections) && plan.sections.length > 0) {
      setSections(plan.sections);
      return;
    }
    const secs = await tablesService.getFloorPlanSections(plan.id);
    setSections(secs);
  }, []);

  const setActiveFloorPlan = useCallback(
    (plan: FloorPlan | null) => {
      activeFloorPlanRef.current = plan;
      setActiveFloorPlanState(plan);
      loadSectionsForPlan(plan).catch(() => {
        setSections([]);
      });
    },
    [loadSectionsForPlan]
  );

  const switchFloorPlan = useCallback(
    async (floorPlanId: number) => {
      const matched = floorPlansRef.current.find((plan) => plan.id === floorPlanId) || null;
      if (!matched) return;
      activeFloorPlanRef.current = matched;
      setActiveFloorPlanState(matched);
      await loadSectionsForPlan(matched);
    },
    [loadSectionsForPlan]
  );

  const refreshFloorPlans = useCallback(
    async (storeId?: number) => {
      try {
        const sid = storeId ?? (userRef.current as any)?.storeId;
        const plans = await tablesService.getFloorPlans({
          storeId: sid,
          isActive: true,
        });
        setFloorPlans(plans);
        floorPlansRef.current = plans;

        const current = activeFloorPlanRef.current;
        const preferred = current
          ? plans.find((plan) => plan.id === current.id) ?? plans[0]
          : plans[0];

        if (preferred) {
          activeFloorPlanRef.current = preferred;
          setActiveFloorPlanState(preferred);
          await loadSectionsForPlan(preferred);
          try {
            const combos = await tablesService.listCombinations(sid);
            setCombinations(combos);
          } catch {
            // combinations may not be configured
          }
        } else {
          activeFloorPlanRef.current = null;
          setActiveFloorPlanState(null);
          setSections([]);
          setCombinations([]);
        }
      } catch {
        // Floor plans may not be configured; tables still work
      }
    },
    [loadSectionsForPlan]
  );

  const refreshTables = useCallback(
    async (storeId?: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const sid = storeId ?? (userRef.current as any)?.storeId;
        const allItems: Table[] = [];
        let page = 1;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
          const res = await tablesService.getTables({
            storeId: sid,
            limit,
            page,
          });
          const items = extractArray<Table>(res);
          allItems.push(...items);
          hasMore = items.length === limit;
          page++;
        }

        setTables(allItems);
        const map = new Map<number, Table>();
        allItems.forEach((t) => map.set(t.id, t));
        tablesRef.current = map;
      } catch (e: any) {
        setError(e.message || 'Failed to load tables');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const refreshAssignments = useCallback(
    async (shiftId?: number, storeId?: number) => {
      try {
        const data = await tablesService.getServerAssignments({
          shiftId,
          storeId: storeId ?? (userRef.current as any)?.storeId,
        });
        setAssignments(data);
      } catch {
        // silent
      }
    },
    []
  );

  const updateTableStatus = useCallback(
    async (id: number, status: TableStatus) => {
      const updated = await tablesService.updateTableStatus(id, { status });
      setTables((prev) => prev.map((t) => (t.id === id ? updated : t)));
      tablesRef.current.set(id, updated);
    },
    []
  );

  const assignServer = useCallback(
    async (
      shiftId: number,
      userId: number,
      sectionId: number,
      storeId: number
    ) => {
      const assignment = await tablesService.assignServer({
        shiftId,
        userId,
        sectionId,
        storeId,
      });
      setAssignments((prev) => [...prev, assignment]);
    },
    []
  );

  const unassignServer = useCallback(async (id: number) => {
    await tablesService.unassignServer(id);
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const combineTables = useCallback(
    async (tableIds: number[], name?: string) => {
      const combo = await tablesService.combineTables({ tableIds, name });
      setCombinations((prev) => [...prev, combo]);
    },
    []
  );

  const uncombineTables = useCallback(async (id: number) => {
    await tablesService.uncombineTables(id);
    setCombinations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const getTableById = useCallback(
    (id: number) => tablesRef.current.get(id) || tables.find((t) => t.id === id),
    [tables]
  );

  const myTables = useMemo(() => {
    const userId = (user as any)?.id;
    if (!userId) return [];
    const mySectionIds = new Set(
      assignments.filter((a) => a.userId === userId).map((a) => a.sectionId)
    );
    if (mySectionIds.size === 0) return tables;
    return tables.filter((t) => mySectionIds.has(t.sectionId));
  }, [tables, assignments, user]);

  const value = useMemo<TablesContextType>(
    () => ({
      tables,
      floorPlans,
      activeFloorPlan,
      sections,
      assignments,
      combinations,
      isLoading,
      error,
      setActiveFloorPlan,
      switchFloorPlan,
      refreshFloorPlans,
      refreshTables,
      refreshAssignments,
      updateTableStatus,
      assignServer,
      unassignServer,
      combineTables,
      uncombineTables,
      getTableById,
      myTables,
    }),
    [
      tables,
      floorPlans,
      activeFloorPlan,
      sections,
      assignments,
      combinations,
      isLoading,
      error,
      setActiveFloorPlan,
      switchFloorPlan,
      refreshFloorPlans,
      refreshTables,
      refreshAssignments,
      updateTableStatus,
      assignServer,
      unassignServer,
      combineTables,
      uncombineTables,
      getTableById,
      myTables,
    ]
  );

  return (
    <TablesContext.Provider value={value}>
      {children}
    </TablesContext.Provider>
  );
};

export function useTables() {
  const ctx = useContext(TablesContext);
  if (!ctx) throw new Error('useTables must be used within TablesProvider');
  return ctx;
}
