import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:1500";
  // expense-service is a separate local process (not part of the monolith) —
  // proxied directly here so local dev doesn't require running the gateway.
  const expenseApiProxyTarget =
    env.VITE_EXPENSE_API_PROXY_TARGET || "http://localhost:4004";

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 3000,
      proxy: {
        // more specific path must be registered before the general '/v1/api' rule below
        "/v1/api/expenses": {
          target: expenseApiProxyTarget,
          changeOrigin: true,
        },
        "/v1/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        "/socket.io": {
          target: apiProxyTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
