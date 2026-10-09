import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import routes from "./routes";
import { errorHandler } from "./middleware/error_middleware";
import { getAllowedOrigins, isOriginAllowed } from "./config/cors";
import { createInternalAuthMiddleware } from "@app/shared-auth";
import { prisma } from "./config/prisma";
import { openApiDefinition } from "./docs/openapi";

dotenv.config();

const app = express();

// Behind the gateway, req.protocol/req.secure would otherwise report the
// internal http hop rather than the client's https.
app.set("trust proxy", 1);

app.use(helmet());
app.use(compression());

// Registered before the internal guard so Render can probe it directly.
app.get("/v1/api/health", async (_req, res) => {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  res.status(dbOk ? 200 : 503).json({
    success: dbOk,
    message: dbOk
      ? "Expense service is running"
      : "Expense service is degraded",
    dependencies: { postgres: dbOk },
    timestamp: new Date().toISOString(),
  });
});

// Rate limiting lives in the gateway, not here — see the note in src/app.ts
// of the monolith. Behind the gateway req.ip is the hop address, so a per-IP
// limit at this layer is a single global bucket.

// Docs are public so you can read the spec without the gateway. Try it out
// still needs a JWT, and should target the gateway server (see openapi.ts).
app.get("/api-docs.json", (_req, res) => {
  res.json(openApiDefinition);
});
app.use("/api-docs", (_req, res, next) => {
  res.removeHeader("Content-Security-Policy");
  next();
});
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiDefinition, {
    customSiteTitle: "Expense Tracker API",
    swaggerOptions: {
      persistAuthorization: true,
      withCredentials: true,
    },
  }),
);

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

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// Only the gateway may reach the application routes. Health is exempt above.
const internalSecret = process.env.INTERNAL_SECRET;
if (internalSecret) {
  app.use("/v1/api", createInternalAuthMiddleware(internalSecret));
} else {
  console.warn(
    "⚠️ INTERNAL_SECRET is not set — this service accepts direct public " +
      "traffic, bypassing the gateway. Set it in every environment but local.",
  );
}

app.use("/v1/api", routes);

app.use(errorHandler);

export default app;
