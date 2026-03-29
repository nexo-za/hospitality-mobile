import { io, Socket, ManagerOptions, SocketOptions } from "socket.io-client";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiConfig } from "../../config/appConfig";
import createTaggedLogger from "../utils/appLogger";

const log = createTaggedLogger("SocketService");

type EventCallback = (...args: any[]) => void;

export interface SocketServiceOptions {
  storeId?: number;
  organizationId?: number;
}

const CHECK_EVENTS = [
  "check:opened",
  "check:closed",
  "check:voided",
  "check:update",
  "check:itemAdded",
  "check:itemFired",
  "check:itemVoided",
] as const;

const GENERAL_EVENTS = [
  "table:update",
  "approval:request",
  "payment:failed",
] as const;

const KDS_EVENTS = [
  "kds:ticketCreated",
  "kds:ticketStarted",
  "kds:ticketBumped",
  "kds:ticketRecalled",
  "kds:ticketReady",
  "kds:ticketUpdated",
  "kds:stationUpdated",
  "kds:itemStatusChanged",
] as const;

export type CheckEvent = typeof CHECK_EVENTS[number];
export type KDSEvent = typeof KDS_EVENTS[number];
export type GeneralEvent = typeof GENERAL_EVENTS[number];
export type SocketEvent = CheckEvent | KDSEvent | GeneralEvent | "connect" | "disconnect" | "reconnect";

class SocketService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<EventCallback>>();
  private options: SocketServiceOptions = {};
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

  async connect(token: string, opts?: SocketServiceOptions): Promise<void> {
    if (this.socket?.connected) {
      log.debug("Already connected, skipping");
      return;
    }

    this.options = opts ?? {};

    const baseUrl = getApiConfig().url.replace(/\/api\/?$/, "");

    const socketOpts: Partial<ManagerOptions & SocketOptions> = {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    };

    this.socket = io(baseUrl, socketOpts);

    this.socket.on("connect", () => {
      log.info("Connected:", this.socket?.id);
      this.autoJoinRooms();
      this.emit("connect");
    });

    this.socket.on("disconnect", (reason) => {
      log.warn("Disconnected:", reason);
      this.emit("disconnect", reason);
    });

    this.socket.io.on("reconnect", (attempt) => {
      log.info("Reconnected after", attempt, "attempts");
      this.autoJoinRooms();
      this.emit("reconnect", attempt);
    });

    [...CHECK_EVENTS, ...KDS_EVENTS, ...GENERAL_EVENTS].forEach((event) => {
      this.socket!.on(event, (data: any) => {
        log.debug(event, data);
        this.emit(event, data);
      });
    });

    this.appStateSubscription = AppState.addEventListener("change", this.handleAppState);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.listeners.clear();
    log.info("Disconnected and cleaned up");
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ---- Room management ----

  joinKDS(stationId: number): void {
    this.socket?.emit("join:kds", stationId);
    log.debug("Joined KDS station", stationId);
  }

  leaveKDS(stationId: number): void {
    this.socket?.emit("leave:kds", stationId);
    log.debug("Left KDS station", stationId);
  }

  joinCheck(checkId: number): void {
    this.socket?.emit("join:check", checkId);
  }

  leaveCheck(checkId: number): void {
    this.socket?.emit("leave:check", checkId);
  }

  // ---- Pub/sub ----

  on(event: SocketEvent | string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((cb) => {
      try { cb(...args); } catch (e) { log.error("Listener error on", event, e); }
    });
  }

  // ---- Internal helpers ----

  private autoJoinRooms(): void {
    const { storeId, organizationId } = this.options;
    if (storeId) this.socket?.emit("room:join", { room: `store:${storeId}` });
    if (organizationId) this.socket?.emit("room:join", { room: `org:${organizationId}` });
  }

  private handleAppState = (state: AppStateStatus): void => {
    if (state === "active" && this.socket && !this.socket.connected) {
      log.info("App foregrounded, reconnecting…");
      this.socket.connect();
    }
  };
}

export default new SocketService();
