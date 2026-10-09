/**
 * Fails fast at startup if required configuration is missing, listing every
 * missing variable at once.
 *
 * Without this, a blank env var surfaces as whatever the downstream client
 * happens to throw — mongoose reports `uri must be a string, got "undefined"`,
 * Firebase throws on an invalid cert — so a half-configured deploy is found one
 * variable per deploy cycle instead of all at once.
 */

const REQUIRED_PRODUCTION = [
  "JWT_SECRET",
  "MONGODB_URI",
  "REDIS_URL",
  "CLIENT_URL",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_PRIVATE_KEY_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_CLIENT_ID",
] as const;

const REQUIRED_DEVELOPMENT = ["JWT_SECRET", "DEV_MONGODB_URI"] as const;

// Not fatal, but each has a silent-failure mode worth naming.
const RECOMMENDED: Record<string, string> = {
  REDIS_PORT:
    "defaults to 6379 — wrong for hosted Redis, which uses a custom port",
  REDIS_PASSWORD:
    "hosted Redis requires auth; without it the connection is refused",
  // INTERNAL_SECRET is warned about in app.ts, at the point it is used.
};

export function validateEnv(): void {
  const isDev = process.env.NODE_ENV === "development";
  const required = isDev ? REQUIRED_DEVELOPMENT : REQUIRED_PRODUCTION;

  const missing = required.filter((key) => !process.env[key]?.trim());
  const missingRecommended = Object.keys(RECOMMENDED).filter(
    (key) => !process.env[key]?.trim(),
  );

  for (const key of missingRecommended) {
    console.warn(`⚠️  ${key} is not set — ${RECOMMENDED[key]}`);
  }

  if (missing.length === 0) return;

  console.error(
    `\n❌ FATAL: ${missing.length} required environment variable(s) missing ` +
      `for NODE_ENV=${process.env.NODE_ENV ?? "(unset)"}:\n`,
  );
  for (const key of missing) {
    console.error(`   • ${key}`);
  }
  console.error(
    `\nOn Render these are the "sync: false" entries in render.yaml — the ` +
      `blueprint creates them blank and they must be filled in per service ` +
      `in the dashboard (Environment tab).\n`,
  );
  process.exit(1);
}
