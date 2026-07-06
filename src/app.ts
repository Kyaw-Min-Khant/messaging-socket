import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";
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
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

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

// Proxy /v1/api/expenses to the expense microservice — placed before body
// parsing so the raw request stream is forwarded intact.
if (process.env.EXPENSE_SERVICE_URL) {
  app.use(
    "/v1/api/expenses",
    createProxyMiddleware({
      target: process.env.EXPENSE_SERVICE_URL,
      changeOrigin: true,
      xfwd: true,
    }),
  );
}

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
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
