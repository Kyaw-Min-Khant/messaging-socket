import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import dotenv from "dotenv";
import { getAllowedOrigins, isOriginAllowed } from "@app/shared-config";
import { generalLimiter, authLimiter } from "./middleware/rateLimiters";
import { expenseProxy, monolithProxy } from "./proxies";

dotenv.config();

const app = express();

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

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Gateway is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/v1/api", generalLimiter);
app.use("/v1/api/auth/login", authLimiter);
app.use("/v1/api/auth/register", authLimiter);

// expenseProxy has its own path filter ("/v1/api/expenses") built in,
// so mount at root — hpm matches internally and forwards the full path.
app.use(expenseProxy);

// Everything else still lives on the original monolith, unchanged, until
// its own extraction phase cuts the relevant prefix over above this line.
app.use("/v1/api", monolithProxy);

export default app;
