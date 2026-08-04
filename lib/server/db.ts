import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/app/generated/prisma/client";
import { resolveDatabasePoolMax } from "@/lib/server/database-pool";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Brak DATABASE_URL. Skopiuj .env.example do .env i uzupełnij połączenie z PostgreSQL.",
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};
const poolMax = resolveDatabasePoolMax(
  connectionString,
  process.env.KLA_DATABASE_POOL_MAX,
);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 5_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5_000,
      max: poolMax,
      maxLifetimeSeconds: 60,
    }),
  });

// Next.js może załadować ten moduł z kilku chunków serwerowych. Jedna pula na
// proces zapobiega przekroczeniu limitu połączeń małej bazy testowej.
globalForPrisma.prisma ??= db;
