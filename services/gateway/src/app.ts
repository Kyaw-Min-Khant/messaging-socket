import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import dotenv from "dotenv";
import { getAllowedOrigins, isOriginAllowed } from "@app/shared-config";
import { generalLimiter, authLimiter } from "./middleware/rateLimiters";
import {
  expenseProxy,
  monolithProxy,
  socketProxy,
  EXPENSE_SERVICE_URL,
  MONOLITH_URL,
} from "./proxies";

dotenv.config();

const app = express();

// Render terminates TLS at its edge proxy, so req.ip is the proxy's address
// unless we trust one hop. Without this every client shares a single
// rate-limit bucket, and express-rate-limit v7 rejects the X-Forwarded-For it
// sees. A hop count rather than `true` — `true` lets clients spoof the header.
app.set("trust proxy", 1);

app.use(helmet());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// CORS is centralized here — the only publicly reachable service — and no
// longer duplicated in every downstream service's own Express app.
const allowedOrigins = getAllowedOrigins();
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
  }),
);

// Liveness — is this process up. Deliberately shallow so a downstream outage
// never causes Render to restart a healthy gateway.
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Gateway is running",
    timestamp: new Date().toISOString(),
  });
});

// Readiness — can this gateway actually serve traffic. Probes both upstreams.
app.get("/health/ready", async (_req, res) => {
  const probe = async (name: string, base: string, path: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(`${base}${path}`, {
        signal: controller.signal,
      });
      return { name, ok: response.ok, status: response.status };
    } catch (error) {
      return { name, ok: false, error: (error as Error).message };
    } finally {
      clearTimeout(timer);
    }
  };

  const upstreams = await Promise.all([
    probe("monolith", MONOLITH_URL, "/v1/api/health"),
    probe("expense-service", EXPENSE_SERVICE_URL, "/v1/api/health"),
  ]);

  const ready = upstreams.every((u) => u.ok);
  res.status(ready ? 200 : 503).json({ success: ready, upstreams });
});

app.use("/v1/api", generalLimiter);
app.use("/v1/api/auth/login", authLimiter);
app.use("/v1/api/auth/register", authLimiter);

// Socket.IO opens with an HTTP polling handshake *before* upgrading to a
// WebSocket, and that request never reaches the raw server's "upgrade" event.
// Without this mount it falls through to a 404 and only clients pinned to
// transports:["websocket"] can connect at all.
app.use("/socket.io", socketProxy);

// expenseProxy has its own path filter ("/v1/api/expenses") built in,
// so mount at root — hpm matches internally and forwards the full path.
app.use(expenseProxy);

// Everything else still lives on the original monolith, unchanged, until
// its own extraction phase cuts the relevant prefix over above this line.
app.use("/v1/api", monolithProxy);

export default app;
