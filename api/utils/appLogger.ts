type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const minLevel: LogLevel = __DEV__ ? "debug" : "warn";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel];
}

function formatArgs(tag: string, args: unknown[]): unknown[] {
  return [`[${tag}]`, ...args];
}

function createTaggedLogger(tag: string) {
  return {
    debug(...args: unknown[]) {
      if (shouldLog("debug")) console.log(...formatArgs(tag, args));
    },
    info(...args: unknown[]) {
      if (shouldLog("info")) console.info(...formatArgs(tag, args));
    },
    warn(...args: unknown[]) {
      if (shouldLog("warn")) console.warn(...formatArgs(tag, args));
    },
    error(...args: unknown[]) {
      if (shouldLog("error")) console.error(...formatArgs(tag, args));
    },
  };
}

export type AppLogger = ReturnType<typeof createTaggedLogger>;

export default createTaggedLogger;
