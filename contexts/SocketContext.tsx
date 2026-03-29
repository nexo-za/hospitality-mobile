import React, { createContext, useContext, useEffect, useRef, useCallback } from "react";
import socketService, { SocketEvent } from "@/api/services/socketService";
import { useAuth } from "@/contexts/AuthContext";
import storage, { STORAGE_KEYS } from "@/utils/storage";

interface SocketContextValue {
  isConnected: boolean;
  joinKDS: (stationId: number) => void;
  leaveKDS: (stationId: number) => void;
  joinCheck: (checkId: number) => void;
  leaveCheck: (checkId: number) => void;
  on: (event: SocketEvent | string, callback: (...args: any[]) => void) => () => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export const useSocket = (): SocketContextValue => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const connectedRef = useRef(false);
  const [, forceRender] = React.useState(0);

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      if (!isAuthenticated || !user) return;

      const token = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN, false);
      if (!token || typeof token !== "string") return;

      const userAny = user as any;
      await socketService.connect(token, {
        storeId: userAny.storeId ?? userAny.store_id,
        organizationId: userAny.organizationId ?? userAny.organization_id,
      });

      connectedRef.current = true;
      if (mounted) forceRender((n) => n + 1);
    };

    connect();

    const unsubConnect = socketService.on("connect", () => {
      connectedRef.current = true;
      if (mounted) forceRender((n) => n + 1);
    });

    const unsubDisconnect = socketService.on("disconnect", () => {
      connectedRef.current = false;
      if (mounted) forceRender((n) => n + 1);
    });

    return () => {
      mounted = false;
      unsubConnect();
      unsubDisconnect();
      socketService.disconnect();
      connectedRef.current = false;
    };
  }, [isAuthenticated, user]);

  const value: SocketContextValue = {
    isConnected: connectedRef.current,
    joinKDS: useCallback((id: number) => socketService.joinKDS(id), []),
    leaveKDS: useCallback((id: number) => socketService.leaveKDS(id), []),
    joinCheck: useCallback((id: number) => socketService.joinCheck(id), []),
    leaveCheck: useCallback((id: number) => socketService.leaveCheck(id), []),
    on: useCallback((event: SocketEvent | string, cb: (...args: any[]) => void) => socketService.on(event, cb), []),
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export default SocketContext;
