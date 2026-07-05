import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __expensePrisma: PrismaClient | undefined;
}

export const prisma =
  global.__expensePrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV === "development") {
  global.__expensePrisma = prisma;
}
