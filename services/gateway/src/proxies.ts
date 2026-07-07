import { createProxyMiddleware } from "http-proxy-middleware";

/**
 * Routing table for the gateway. Only /v1/api/expenses is wired to a real
 * extracted service today (expense-service); everything else still proxies
 * to the original monolith (MONOLITH_URL) unchanged, per the phased rollout —
 * auth-service/user-service/messaging-service get their own entries here only
 * once each is actually extracted, at which point this file is the one place
 * that changes to cut traffic over (or roll it back).
 */
const EXPENSE_SERVICE_URL =
  process.env.EXPENSE_SERVICE_URL ?? "http://localhost:4004";
const MONOLITH_URL = process.env.MONOLITH_URL ?? "http://localhost:1500";

export const expenseProxy = createProxyMiddleware({
  target: EXPENSE_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  proxyTimeout: 10000,
  timeout: 10000,
  pathRewrite: { "^/": "/v1/api/expenses/" },
  onError: (_err, _req, res) => {
    if (!res.headersSent) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: false,
          error:
            "Expense service is starting up. Please try again in a moment.",
        }),
      );
    }
  },
});

export const monolithProxy = createProxyMiddleware({
  target: MONOLITH_URL,
  changeOrigin: true,
  xfwd: true,
});

// Dedicated instance for the Socket.IO upgrade path — kept separate from the
// REST monolithProxy above so its `.upgrade` handler can be wired to the raw
// http.Server's "upgrade" event in index.ts without affecting REST proxying.
export const socketProxy = createProxyMiddleware({
  target: MONOLITH_URL,
  changeOrigin: true,
  ws: true,
});
