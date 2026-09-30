import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import routes from "./routes";
import {
  get404HTML,
  getErrorHTML,
  getWelcomeHTML,
} from "./utils/htmlTemplates";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { errorHandler } from "./middleware/error_middleware";
import { getAllowedOrigins, isOriginAllowed } from "./config/cors";
import mongoose from "mongoose";
import { redisClient } from "./config/redis";
import { createInternalOnly } from "./middleware/internal_auth";
dotenv.config();

const app = express();

// Behind the gateway (and Render's edge), req.ip is the proxy's address
// unless we trust one hop. Without this every client shares a single
// rate-limit bucket, and express-rate-limit v7 rejects the X-Forwarded-For
// the gateway sets via xfwd. A hop count rather than `true` — `true` would
// let clients spoof the header outright.
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());
app.use(compression());

// Health check is registered before the rate limiter and before the internal
// guard: probes all arrive from one IP (the gateway / Render), so behind the
// limiter a traffic spike would 429 them and read as "unhealthy".
app.get("/v1/api/health", async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  let redisOk = false;
  try {
    redisOk = redisClient.isOpen && (await redisClient.ping()) === "PONG";
  } catch {
    redisOk = false;
  }

  const healthy = mongoOk && redisOk;
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? "Server is running" : "Server is degraded",
    dependencies: { mongo: mongoOk, redis: redisOk },
    timestamp: new Date().toISOString(),
  });
});

// Rate limiting — general API
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/v1/api", limiter);

// Stricter limiter for auth endpoints to prevent brute force
const authLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 50,
  message: "Too many auth attempts, please try again later.",
});

app.use("/v1/api/auth/login", authLimiter);
app.use("/v1/api/auth/register", authLimiter);

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Messenger API",
      version: "1.0.0",
    },
  },
  apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middleware
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

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Only the gateway may reach the application routes. Health is exempt above
// (registered before this line), so Render's probe still works.
const internalSecret = process.env.INTERNAL_SECRET;
if (internalSecret) {
  app.use("/v1/api", createInternalOnly(internalSecret));
} else {
  console.warn(
    "⚠️ INTERNAL_SECRET is not set — this service accepts direct public " +
      "traffic, bypassing the gateway. Set it in every environment but local.",
  );
}

// Routes
app.use("/v1/api", routes);

// Root endpoint
app.get("/", (req, res) => {
  const acceptsHTML = req.accepts("html");
  if (acceptsHTML) {
    res.status(200).send(getWelcomeHTML());
  } else {
    res.status(200).json({
      success: true,
      message: "Welcome to the Messenger API",
    });
  }
});

app.use(errorHandler);

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("❌ Error:", err.stack);
    const acceptsHTML = req.accepts("html");

    if (acceptsHTML) {
      res.status(500).send(getErrorHTML(500, "Something went wrong!"));
    } else {
      res.status(500).json({
        success: false,
        error:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Something went wrong!",
      });
    }
  },
);

// 404 handler
app.use("*", (req, res) => {
  // Check if the request expects HTML (browser request)
  const acceptsHTML = req.accepts("html");

  if (acceptsHTML) {
    res.status(404).send(get404HTML(req.originalUrl));
  } else {
    res.status(404).json({
      success: false,
      error: "Route not found",
    });
  }
});

export default app;
