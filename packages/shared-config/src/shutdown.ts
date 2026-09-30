import type { Server } from "http";

export type Cleanup = () => Promise<unknown> | unknown;

export interface ShutdownOptions {
  /** Milliseconds to wait for in-flight work before forcing exit. */
  timeoutMs?: number;
  /** Label used in shutdown logs, e.g. "gateway". */
  name?: string;
}

/**
 * Drains an HTTP server on SIGTERM/SIGINT before exiting.
 *
 * Docker and Render both send SIGTERM on stop/redeploy; Node's default is to
 * die immediately, which drops in-flight responses and live WebSocket sessions
 * and leaves database connections for the server to time out. Each service
 * passes its own cleanups (mongoose/redis/prisma) so the contract stays
 * identical everywhere.
 */
export function registerShutdown(
  server: Server,
  cleanups: Cleanup[] = [],
  options: ShutdownOptions = {},
): void {
  const { timeoutMs = 10_000, name = "service" } = options;
  let closing = false;

  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    console.log(`🛑 ${name}: ${signal} received, draining…`);

    // Force exit if a hung connection keeps the loop alive past the deadline.
    const forced = setTimeout(() => {
      console.error(`⚠️ ${name}: drain timed out after ${timeoutMs}ms, forcing exit`);
      process.exit(1);
    }, timeoutMs);
    forced.unref();

    await new Promise<void>((resolve) => server.close(() => resolve()));

    const results = await Promise.allSettled(cleanups.map((fn) => fn()));
    for (const result of results) {
      if (result.status === "rejected") {
        console.error(`⚠️ ${name}: cleanup failed:`, result.reason);
      }
    }

    clearTimeout(forced);
    console.log(`👋 ${name}: shutdown complete`);
    process.exit(0);
  };

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => void shutdown(signal));
  }
}
