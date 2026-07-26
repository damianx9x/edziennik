import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const demoPassword = process.env.KLA_DEMO_PASSWORD;

if (!connectionString) {
  throw new Error("Brak DATABASE_URL. Uzupełnij prywatny plik .env.");
}

if (!demoPassword || demoPassword.length < 12) {
  throw new Error(
    "Brak KLA_DEMO_PASSWORD (minimum 12 znaków). Uzupełnij prywatny plik .env.",
  );
}

const demoGroups = [
  ["MONACO", "klasa 8", 3],
  ["TORONTO", "klasa 2D", 5],
  ["ORLANDO", "klasa 6", 6],
  ["OXFORD", "grupa szkolna", 4],
  ["BARCELONA", "klasa 3", 4],
  ["LONDON", "SP 38", 7],
  ["VENICE", "klasa 1 C–D", 4],
  ["MIAMI", "klasa 4A", 2],
];

const pool = new Pool({ connectionString });
const client = await pool.connect();

async function ensureCredentialUser({
  schoolId,
  email,
  name,
  role,
  withProfile,
}) {
  const userResult = await client.query(
    `INSERT INTO "User" (
       "id", "schoolId", "email", "name", "role", "status",
       "emailVerified", "createdAt", "updatedAt"
     )
     VALUES ($1, $2, $3, $4, $5, 'ACTIVE', true, NOW(), NOW())
     ON CONFLICT ("email")
     DO UPDATE SET
       "schoolId" = EXCLUDED."schoolId",
       "name" = EXCLUDED."name",
       "role" = EXCLUDED."role",
       "status" = 'ACTIVE',
       "emailVerified" = true,
       "archivedAt" = NULL,
       "updatedAt" = NOW()
     RETURNING "id"`,
    [randomUUID(), schoolId, email, name, role],
  );
  const userId = userResult.rows[0].id;
  const passwordHash = await hashPassword(demoPassword);
  const accountResult = await client.query(
    `SELECT "id"
     FROM "Account"
     WHERE "userId" = $1 AND "providerId" = 'credential'
     LIMIT 1
     FOR UPDATE`,
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
       VALUES ($1, $2, 'credential', $3, $4, NOW(), NOW())`,
      [randomUUID(), userId, userId, passwordHash],
    );
  }

  if (withProfile === "teacher") {
    await client.query(
      `INSERT INTO "TeacherProfile" ("userId", "displayName")
       VALUES ($1, $2)
       ON CONFLICT ("userId")
       DO UPDATE SET "displayName" = EXCLUDED."displayName"`,
      [userId, name],
    );
  }

  if (withProfile === "student") {
    await client.query(
      `INSERT INTO "StudentProfile" ("userId")
       VALUES ($1)
       ON CONFLICT ("userId") DO NOTHING`,
      [userId],
    );
  }

  return userId;
}

try {
  await client.query("BEGIN");

  const schoolResult = await client.query(
    `INSERT INTO "School" (
       "id", "name", "slug", "timeZone", "createdAt", "updatedAt"
     )
     VALUES ($1, $2, $3, 'Europe/Warsaw', NOW(), NOW())
     ON CONFLICT ("slug")
     DO UPDATE SET "name" = EXCLUDED."name", "updatedAt" = NOW()
     RETURNING "id"`,
    [
      randomUUID(),
      "King’s Language Academy — DEMO",
      "kings-language-academy-demo",
    ],
  );
  const schoolId = schoolResult.rows[0].id;

  const directorId = await ensureCredentialUser({
    schoolId,
    email: "dyrektor.demo@invalid.example",
    name: "Dyrektor Demo",
    role: "DIRECTOR",
  });
  const teacherId = await ensureCredentialUser({
    schoolId,
    email: "wykladowca.demo@invalid.example",
    name: "Wykładowca Demo",
    role: "TEACHER",
    withProfile: "teacher",
  });
  const parentId = await ensureCredentialUser({
    schoolId,
    email: "rodzic.demo@invalid.example",
    name: "Rodzic Demo",
    role: "PARENT",
  });
  const panelStudentId = await ensureCredentialUser({
    schoolId,
    email: "uczen.panel.demo@invalid.example",
    name: "Uczeń Panel Demo",
    role: "STUDENT",
    withProfile: "student",
  });

  for (const [name, capacity] of [
    ["Cambridge", 8],
    ["Oxford", 8],
    ["Online", 8],
  ]) {
    await client.query(
      `INSERT INTO "Room" (
         "id", "schoolId", "name", "capacity", "isActive",
         "createdAt", "updatedAt"
       )
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())
       ON CONFLICT ("schoolId", "name")
       DO UPDATE SET
         "capacity" = EXCLUDED."capacity",
         "isActive" = true,
         "archivedAt" = NULL,
         "updatedAt" = NOW()`,
      [randomUUID(), schoolId, name, capacity],
    );
  }

  let firstGroupId;
  let studentSequence = 1;

  for (const [city, classLabel, studentCount] of demoGroups) {
    const groupName = `KLA ${city} ${classLabel} 2025/26`;
    const groupResult = await client.query(
      `INSERT INTO "CourseGroup" (
         "id", "schoolId", "name", "cefrLevel", "isActive",
         "createdAt", "updatedAt"
       )
       VALUES ($1, $2, $3, 'MIXED', true, NOW(), NOW())
       ON CONFLICT ("schoolId", "name")
       DO UPDATE SET
         "isActive" = true,
         "archivedAt" = NULL,
         "updatedAt" = NOW()
       RETURNING "id"`,
      [randomUUID(), schoolId, groupName],
    );
    const groupId = groupResult.rows[0].id;
    firstGroupId ??= groupId;

    for (let index = 0; index < studentCount; index += 1) {
      const sequence = String(studentSequence).padStart(3, "0");
      const studentResult = await client.query(
        `INSERT INTO "User" (
           "id", "schoolId", "email", "name", "role", "status",
           "emailVerified", "createdAt", "updatedAt"
         )
         VALUES ($1, $2, $3, $4, 'STUDENT', 'ACTIVE', true, NOW(), NOW())
         ON CONFLICT ("email")
         DO UPDATE SET
           "schoolId" = EXCLUDED."schoolId",
           "name" = EXCLUDED."name",
           "role" = 'STUDENT',
           "status" = 'ACTIVE',
           "archivedAt" = NULL,
           "updatedAt" = NOW()
         RETURNING "id"`,
        [
          randomUUID(),
          schoolId,
          `uczen.demo.${sequence}@invalid.example`,
          `Uczeń Demo ${sequence}`,
        ],
      );
      const studentId = studentResult.rows[0].id;

      await client.query(
        `INSERT INTO "StudentProfile" ("userId")
         VALUES ($1)
         ON CONFLICT ("userId") DO NOTHING`,
        [studentId],
      );
      await client.query(
        `INSERT INTO "Enrollment" (
           "groupId", "studentId", "status", "joinedAt"
         )
         VALUES ($1, $2, 'ACTIVE', NOW())
         ON CONFLICT ("groupId", "studentId")
         DO UPDATE SET "status" = 'ACTIVE', "endedAt" = NULL`,
        [groupId, studentId],
      );
      studentSequence += 1;
    }
  }

  if (firstGroupId) {
    await client.query(
      `INSERT INTO "GroupTeacher" (
         "groupId", "teacherId", "isPrimary", "assignedAt"
       )
       VALUES ($1, $2, true, NOW())
       ON CONFLICT ("groupId", "teacherId")
       DO UPDATE SET "isPrimary" = true, "archivedAt" = NULL`,
      [firstGroupId, teacherId],
    );
    await client.query(
      `INSERT INTO "Enrollment" (
         "groupId", "studentId", "status", "joinedAt"
       )
       VALUES ($1, $2, 'ACTIVE', NOW())
       ON CONFLICT ("groupId", "studentId")
       DO UPDATE SET "status" = 'ACTIVE', "endedAt" = NULL`,
      [firstGroupId, panelStudentId],
    );
  }

  await client.query(
    `INSERT INTO "ParentChild" (
       "schoolId", "parentId", "childId", "createdAt"
     )
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT ("parentId", "childId")
     DO UPDATE SET "schoolId" = EXCLUDED."schoolId", "archivedAt" = NULL`,
    [schoolId, parentId, panelStudentId],
  );

  await client.query(
    `INSERT INTO "AuditLog" (
       "id", "schoolId", "actorId", "action", "entityType", "entityId",
       "metadata", "createdAt"
     )
     VALUES (
       $1, $2, $3, 'demo.seed.completed', 'School', $4,
       $5::jsonb, NOW()
     )`,
    [
      randomUUID(),
      schoolId,
      directorId,
      schoolId,
      JSON.stringify({
        groups: demoGroups.length,
        syntheticStudents: studentSequence - 1,
      }),
    ],
  );

  await client.query("COMMIT");
  console.log(
    `Dane demo gotowe: ${demoGroups.length} grup, ${
      studentSequence - 1
    } syntetycznych uczniów, 3 sale i 4 konta testowe.`,
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
