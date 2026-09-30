import type { ClientRequest } from "http";
import { createProxyMiddleware, type Options } from "http-proxy-middleware";

/**
 * Routing table for the gateway. Only /v1/api/expenses is wired to a real
 * extracted service today (expense-service); everything else still proxies
 * to the original monolith (MONOLITH_URL) unchanged, per the phased rollout —
 * auth-service/user-service/messaging-service get their own entries here only
 * once each is actually extracted, at which point this file is the one place
 * that changes to cut traffic over (or roll it back).
 */

/**
 * Render's `fromService` can only emit `host:port` (property: hostport), with
 * no scheme — but http-proxy-middleware requires an absolute URL. Normalizing
 * here keeps render.yaml declarative and lets docker-compose/.env keep passing
 * full URLs unchanged.
 */
const withScheme = (value: string | undefined, fallback: string): string => {
  const raw = (value ?? fallback).trim();
  return /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
};

export const EXPENSE_SERVICE_URL = withScheme(
  process.env.EXPENSE_SERVICE_URL,
  "http://localhost:4004",
);
export const MONOLITH_URL = withScheme(
  process.env.MONOLITH_URL,
  "http://localhost:1500",
);

/**
 * Downstream services are `type: web` on Render (private services are not on
 * the free plan), so they each have a public URL. This header is what lets
 * them tell "came through the gateway" from "came straight off the internet" —
 * see createInternalAuthMiddleware in @app/shared-auth. It authenticates the
 * *caller*, not the user; JWT verification still happens downstream.
 */
export const INTERNAL_SECRET_HEADER = "x-internal-secret";
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

if (!INTERNAL_SECRET) {
  console.warn(
    `⚠️ INTERNAL_SECRET is not set — downstream services cannot distinguish ` +
      `gateway traffic from direct public traffic.`,
  );
}

/** Stamps the internal secret onto a proxied REST request. */
const addInternalSecret = (proxyReq: ClientRequest) => {
  if (INTERNAL_SECRET) {
    proxyReq.setHeader(INTERNAL_SECRET_HEADER, INTERNAL_SECRET);
  }
};

const serviceUnavailable = (service: string, res: unknown) => {
  const response = res as {
    headersSent?: boolean;
    writeHead: (code: number, headers: Record<string, string>) => void;
    end: (body: string) => void;
  };
  if (!response?.writeHead || response.headersSent) return;
  response.writeHead(503, { "Content-Type": "application/json" });
  response.end(
    JSON.stringify({
      success: false,
      error: `${service} is starting up. Please try again in a moment.`,
    }),
  );
};

const baseOptions: Options = {
  changeOrigin: true,
  xfwd: true,
  onProxyReq: addInternalSecret,
};

// Pass the path as first arg so hpm v2 matches internally — Express never
// strips the prefix, so the full /v1/api/expenses/* path reaches the target.
export const expenseProxy = createProxyMiddleware("/v1/api/expenses", {
  ...baseOptions,
  target: EXPENSE_SERVICE_URL,
  proxyTimeout: 10000,
  timeout: 10000,
  onError: (_err, _req, res) => serviceUnavailable("Expense service", res),
});

// Same timeout + error contract as the expense proxy. Without it a cold or
// hung monolith leaves the gateway holding the connection open indefinitely
// and then destroys the socket with no body — the browser sees a bare
// connection reset rather than JSON, on the path that carries auth.
export const monolithProxy = createProxyMiddleware({
  ...baseOptions,
  target: MONOLITH_URL,
  proxyTimeout: 30000,
  timeout: 30000,
  onError: (_err, _req, res) => serviceUnavailable("Server", res),
});

// Dedicated instance for Socket.IO — kept separate from the REST monolithProxy
// so its `.upgrade` handler can be wired to the raw http.Server's "upgrade"
// event in index.ts without affecting REST proxying. `ws: true` also makes
// this usable as Express middleware for the HTTP polling transport, which
// Socket.IO tries *before* upgrading to a WebSocket.
//
// The "/socket.io" context scopes the upgrade handler that hpm subscribes to
// the raw server on first use — without it, every WebSocket upgrade reaching
// the gateway would be forwarded, not just Socket.IO's.
export const socketProxy = createProxyMiddleware("/socket.io", {
  ...baseOptions,
  target: MONOLITH_URL,
  ws: true,
  // The WebSocket upgrade is a separate code path from REST — without this the
  // handshake reaches the monolith unstamped and gets 403'd, which would break
  // real-time while leaving REST working.
  onProxyReqWs: (proxyReq: ClientRequest) => addInternalSecret(proxyReq),
});
