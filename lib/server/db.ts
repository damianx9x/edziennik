import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Brak DATABASE_URL. Skopiuj .env.example do .env i uzupełnij połączenie z PostgreSQL.",
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 5_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5_000,
      maxLifetimeSeconds: 60,
    }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
