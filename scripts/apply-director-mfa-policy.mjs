import { randomUUID } from "node:crypto";

import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("Brak DATABASE_URL. Uzupełnij prywatny plik .env.");
}

if (process.env.KLA_REQUIRE_DIRECTOR_MFA !== "0") {
  console.log("MFA dyrektora pozostaje wymagane. Baza bez zmian.");
  process.exit(0);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  await client.query("BEGIN");
  const directors = await client.query(
    `SELECT "id", "schoolId"
     FROM "User"
     WHERE "role" = 'DIRECTOR'
       AND "status" = 'ACTIVE'
       AND "twoFactorEnabled" = true
     FOR UPDATE`,
  );

  for (const director of directors.rows) {
    await client.query('DELETE FROM "Session" WHERE "userId" = $1', [
      director.id,
    ]);
    await client.query('DELETE FROM "twoFactor" WHERE "userId" = $1', [
      director.id,
    ]);
    await client.query(
      `UPDATE "User"
       SET "twoFactorEnabled" = false, "updatedAt" = NOW()
       WHERE "id" = $1`,
      [director.id],
    );
    await client.query(
      `INSERT INTO "AuditLog" (
         "id", "schoolId", "actorId", "action", "entityType", "entityId",
         "metadata", "createdAt"
       )
       VALUES ($1, $2, NULL, 'identity.director.mfa.disabled_for_pilot',
         'User', $3, $4::jsonb, NOW())`,
      [
        randomUUID(),
        director.schoolId,
        director.id,
        JSON.stringify({ reason: "synthetic-pilot-testing" }),
      ],
    );
  }

  await client.query("COMMIT");
  console.log(
    `Polityka MFA dyrektora zsynchronizowana. Zmienione konta: ${directors.rowCount ?? 0}.`,
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
