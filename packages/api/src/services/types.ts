/** Standard service result wrapper */
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

/** Create a successful result */
export function ok<T>(data: T): ServiceResult<T> {
  return { success: true, data };
}

/** Create an error result */
export function err<T>(error: string, code: string): ServiceResult<T> {
  return { success: false, error, code };
}

/** Trace context for logging */
export type TraceContext = {
  requestId: string;
  userId?: string;
  workspaceId?: string;
  source: string;
};

/** Logger interface (simple, replaceable) */
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/** Default console logger */
export const consoleLogger: Logger = {
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta ?? ""),
};
