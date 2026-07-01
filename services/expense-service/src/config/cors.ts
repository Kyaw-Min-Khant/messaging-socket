/** Comma-separated origins in CLIENT_URL, plus common local dev URLs. */
export function getAllowedOrigins(): string[] {
  const fromEnv = (process.env.CLIENT_URL ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const devDefaults =
    process.env.NODE_ENV === "development"
      ? ["http://localhost:3000", "http://127.0.0.1:3000"]
      : [];

  return [...new Set([...devDefaults, ...fromEnv])];
}

export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[],
): boolean {
  // No Origin header: same-origin browser, Swagger on API host, Postman, mobile apps
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}
