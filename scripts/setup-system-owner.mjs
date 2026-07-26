import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import pg from "pg";

const { Pool } = pg;

const systemOwnerEmail = "bog@owner.kla.internal";
const systemOwnerName = "Właściciel systemu";
const password = process.env.KLA_SYSTEM_OWNER_PASSWORD;
const schoolSlug =
  process.env.KLA_SYSTEM_OWNER_SCHOOL_SLUG ??
  "kings-language-academy-demo";
const resetMfa = process.env.KLA_SYSTEM_OWNER_RESET_MFA === "1";

if (!process.env.DATABASE_URL) {
  throw new Error("Brak DATABASE_URL. Uzupełnij prywatny plik .env.");
}

if (!password || password.length < 12) {
  throw new Error(
    "Ustaw KLA_SYSTEM_OWNER_PASSWORD w prywatnym .env (minimum 12 znaków).",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  await client.query("BEGIN");

  const schoolResult = await client.query(
    'SELECT "id" FROM "School" WHERE "slug" = $1 LIMIT 1',
    [schoolSlug],
  );
  const school = schoolResult.rows[0];
  if (!school) {
    throw new Error(
      `Nie znaleziono szkoły o slug "${schoolSlug}". Najpierw wykonaj migracje i utwórz szkołę.`,
    );
  }

  const userResult = await client.query(
    'SELECT "id", "twoFactorEnabled" FROM "User" WHERE "email" = $1 LIMIT 1 FOR UPDATE',
    [systemOwnerEmail],
  );
  const existingUser = userResult.rows[0];
  const userId = existingUser?.id ?? randomUUID();

  if (existingUser) {
    await client.query(
      `UPDATE "User"
       SET "schoolId" = $1,
           "name" = $2,
           "role" = 'SYSTEM_OWNER',
           "status" = 'ACTIVE',
           "emailVerified" = true,
           "archivedAt" = NULL,
           "banned" = false,
           "banReason" = NULL,
           "banExpires" = NULL,
           "twoFactorEnabled" = CASE WHEN $3 THEN false ELSE "twoFactorEnabled" END,
           "updatedAt" = NOW()
       WHERE "id" = $4`,
      [school.id, systemOwnerName, resetMfa, userId],
    );
  } else {
    await client.query(
      `INSERT INTO "User" (
         "id", "schoolId", "email", "name", "role", "status",
         "emailVerified", "twoFactorEnabled", "createdAt", "updatedAt"
       )
       VALUES ($1, $2, $3, $4, 'SYSTEM_OWNER', 'ACTIVE', true, false, NOW(), NOW())`,
      [userId, school.id, systemOwnerEmail, systemOwnerName],
    );
  }

  const passwordHash = await hashPassword(password);
  const accountResult = await client.query(
    `SELECT "id" FROM "Account"
     WHERE "userId" = $1 AND "providerId" = 'credential'
     LIMIT 1 FOR UPDATE`,
    [userId],
  );

  if (accountResult.rows[0]) {
    await client.query(
      `UPDATE "Account"
       SET "password" = $1, "updatedAt" = NOW()
       WHERE "id" = $2`,
      [passwordHash, accountResult.rows[0].id],
    );
  } else {
    await client.query(
      `INSERT INTO "Account" (
         "id", "accountId", "providerId", "userId", "password",
         "createdAt", "updatedAt"
       )
       VALUES ($1, $2, 'credential', $2, $3, NOW(), NOW())`,
      [randomUUID(), userId, passwordHash],
    );
  }

  await client.query('DELETE FROM "Session" WHERE "userId" = $1', [userId]);
  if (resetMfa) {
    await client.query('DELETE FROM "twoFactor" WHERE "userId" = $1', [
      userId,
    ]);
  }

  await client.query(
    `INSERT INTO "AuditLog" (
       "id", "schoolId", "actorId", "action", "entityType", "entityId",
       "metadata", "createdAt"
     )
     VALUES ($1, $2, $3, 'system.owner.provisioned', 'User', $3, $4::jsonb, NOW())`,
    [
      randomUUID(),
      school.id,
      userId,
      JSON.stringify({
        passwordRotated: true,
        mfaReset: resetMfa,
      }),
    ],
  );

  await client.query("COMMIT");
  console.log(
    "Konto właściciela systemu jest gotowe. Login: bog. MFA jest obowiązkowe przy pierwszym wejściu.",
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
