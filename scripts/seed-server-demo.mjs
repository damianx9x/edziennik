import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { hashPassword } from "better-auth/crypto";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const allowInsecureDemoCredentials =
  process.env.KLA_ALLOW_INSECURE_DEMO_CREDENTIALS === "1";
const fallbackDemoPassword = process.env.KLA_DEMO_PASSWORD;
const demoPasswords = {
  DIRECTOR: process.env.KLA_DEMO_DIRECTOR_PASSWORD ?? fallbackDemoPassword,
  TEACHER: process.env.KLA_DEMO_TEACHER_PASSWORD ?? fallbackDemoPassword,
  PARENT: process.env.KLA_DEMO_PARENT_PASSWORD ?? fallbackDemoPassword,
  STUDENT: process.env.KLA_DEMO_STUDENT_PASSWORD ?? fallbackDemoPassword,
};

if (!connectionString) {
  throw new Error("Brak DATABASE_URL. Uzupełnij prywatny plik .env.");
}

if (
  Object.values(demoPasswords).some(
    (password) =>
      !password || (!allowInsecureDemoCredentials && password.length < 12),
  )
) {
  throw new Error(
    "Brak haseł kont demo (minimum 12 znaków, chyba że jawnie włączono tryb wyłącznie demonstracyjny). Uzupełnij prywatny plik .env.",
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

function stableUuid(value) {
  return `10000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
}

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
  const passwordHash = await hashPassword(demoPasswords[role]);
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
  const locationNames = [
    "Przodkowo",
    "Czeczewo",
    "Wilanowo",
    "Gdańsk Nowatorów",
    "Gdańsk Morena",
    "Gdańsk Niedźwiednik",
    "Gdynia Pogórze",
    "Online",
  ];
  const locationIds = new Map();
  for (const name of locationNames) {
    const locationResult = await client.query(
      `INSERT INTO "Location" (
         "id", "schoolId", "name", "isOnline", "isActive",
         "createdAt", "updatedAt"
       )
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())
       ON CONFLICT ("schoolId", "name")
       DO UPDATE SET
         "isOnline" = EXCLUDED."isOnline",
         "isActive" = true,
         "archivedAt" = NULL,
         "updatedAt" = NOW()
       RETURNING "id"`,
      [randomUUID(), schoolId, name, name === "Online"],
    );
    locationIds.set(name, locationResult.rows[0].id);
  }

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

  const rooms = [];
  for (const [name, capacity, locationName] of [
    ["Cambridge", 8, "Przodkowo"],
    ["Oxford", 8, "Gdańsk Morena"],
    ["Online", 8, "Online"],
  ]) {
    const locationId = locationIds.get(locationName);
    const roomResult = await client.query(
      `INSERT INTO "Room" (
         "id", "schoolId", "locationId", "name", "capacity", "isActive",
         "createdAt", "updatedAt"
       )
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       ON CONFLICT ("schoolId", "name")
       DO UPDATE SET
         "locationId" = EXCLUDED."locationId",
         "capacity" = EXCLUDED."capacity",
         "isActive" = true,
         "archivedAt" = NULL,
         "updatedAt" = NOW()
       RETURNING "id"`,
      [randomUUID(), schoolId, locationId, name, capacity],
    );
    rooms.push({ id: roomResult.rows[0].id, locationId });
  }

  let firstGroupId;
  let studentSequence = 1;
  const groupIds = [];
  const syntheticStudentIds = [];

  for (const [city, classLabel, studentCount] of demoGroups) {
    const groupName = `KLA ${city} ${classLabel} 2025/26`;
    const groupResult = await client.query(
      `INSERT INTO "CourseGroup" (
         "id", "schoolId", "locationId", "name", "cefrLevel", "isActive",
         "createdAt", "updatedAt"
       )
       VALUES ($1, $2, $3, $4, 'MIXED', true, NOW(), NOW())
       ON CONFLICT ("schoolId", "name")
       DO UPDATE SET
         "locationId" = EXCLUDED."locationId",
         "isActive" = true,
         "archivedAt" = NULL,
         "updatedAt" = NOW()
       RETURNING "id"`,
      [
        randomUUID(),
        schoolId,
        rooms[groupIds.length % rooms.length].locationId,
        groupName,
      ],
    );
    const groupId = groupResult.rows[0].id;
    firstGroupId ??= groupId;
    groupIds.push(groupId);

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
      syntheticStudentIds.push(studentId);

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

  for (const [index, groupId] of groupIds.entries()) {
    const preferredRoomId = rooms[index % rooms.length].id;
    await client.query(
      `INSERT INTO "GroupTeacher" (
         "groupId", "teacherId", "isPrimary", "assignedAt"
       )
       VALUES ($1, $2, true, NOW())
       ON CONFLICT ("groupId", "teacherId")
       DO UPDATE SET "isPrimary" = true, "archivedAt" = NULL`,
      [groupId, teacherId],
    );
    await client.query(
      `INSERT INTO "SchedulingRequirement" (
         "id", "schoolId", "groupId", "teacherId", "preferredRoomId",
         "lessonsPerWeek", "durationMinutes", "allowedWeekdays",
         "preferredWeekdays", "earliestStartMinute", "latestEndMinute",
         "preferredStartMinute", "isActive", "createdAt", "updatedAt"
       )
       VALUES (
         $1, $2, $3, $4, $5, 2, 60, ARRAY[1,2,3,4,5],
         ARRAY[$6]::integer[], 900, 1200, $7, true, NOW(), NOW()
       )
       ON CONFLICT ("groupId")
       DO UPDATE SET
         "schoolId" = EXCLUDED."schoolId",
         "teacherId" = EXCLUDED."teacherId",
         "preferredRoomId" = EXCLUDED."preferredRoomId",
         "isActive" = true,
         "updatedAt" = NOW()`,
      [
        randomUUID(),
        schoolId,
        groupId,
        teacherId,
        preferredRoomId,
        (index % 5) + 1,
        (15 + (index % 4)) * 60,
      ],
    );
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

  for (const childId of syntheticStudentIds.slice(0, 2)) {
    await client.query(
      `INSERT INTO "ParentChild" (
         "schoolId", "parentId", "childId", "createdAt"
       ) VALUES ($1, $2, $3, NOW())
       ON CONFLICT ("parentId", "childId")
       DO UPDATE SET "schoolId" = EXCLUDED."schoolId", "archivedAt" = NULL`,
      [schoolId, parentId, childId],
    );
  }

  const weekStart = new Date();
  const weekday = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (weekday === 0 ? 6 : weekday - 1));
  weekStart.setHours(0, 0, 0, 0);
  let scheduleSlotCount = 0;
  for (const [index, groupId] of groupIds.entries()) {
    const room = rooms[index % rooms.length];
    const conversationResult = await client.query(
      `INSERT INTO "Conversation" (
         "id", "schoolId", "groupId", "createdAt", "updatedAt"
       ) VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT ("groupId")
       DO UPDATE SET "schoolId" = EXCLUDED."schoolId", "archivedAt" = NULL, "updatedAt" = NOW()
       RETURNING "id"`,
      [stableUuid(500 + index), schoolId, groupId],
    );
    const conversationId = conversationResult.rows[0].id;
    await client.query(
      `INSERT INTO "Message" (
         "id", "schoolId", "conversationId", "authorId", "kind", "body",
         "clientRequestId", "requiresAcknowledgement", "createdAt"
       ) VALUES ($1, $2, $3, $4, 'CHAT', $5, $6, $7, NOW())
       ON CONFLICT ("authorId", "clientRequestId")
       DO UPDATE SET "body" = EXCLUDED."body", "requiresAcknowledgement" = EXCLUDED."requiresAcknowledgement"`,
      [
        stableUuid(600 + index),
        schoolId,
        conversationId,
        teacherId,
        `Wiadomość demonstracyjna dla grupy ${index + 1}: proszę sprawdzić plan najbliższych zajęć.`,
        `00000000-0000-4000-8200-${String(index + 1).padStart(12, "0")}`,
        index % 3 === 0,
      ],
    );

    for (const [weekIndex, weekOffset] of [-1, 0, 1].entries()) {
      const startAt = new Date(weekStart);
      startAt.setDate(startAt.getDate() + weekOffset * 7 + (index % 5));
      startAt.setHours(14 + Math.floor(index / 5) * 2, (index % 2) * 15, 0, 0);
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
      const slotId = stableUuid(700 + weekIndex * 20 + index);
      await client.query(
        `INSERT INTO "ScheduleSlot" (
           "id", "schoolId", "groupId", "roomId", "teacherId", "createdById",
           "startAt", "endAt", "timeZone", "status", "topic", "version",
           "createdAt", "updatedAt", "isLocked"
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Europe/Warsaw', $9, $10, 1, NOW(), NOW(), false)
         ON CONFLICT ("id") DO UPDATE SET
           "groupId" = EXCLUDED."groupId", "roomId" = EXCLUDED."roomId",
           "teacherId" = EXCLUDED."teacherId", "startAt" = EXCLUDED."startAt",
           "endAt" = EXCLUDED."endAt", "status" = EXCLUDED."status",
           "topic" = EXCLUDED."topic", "archivedAt" = NULL, "updatedAt" = NOW()`,
        [
          slotId,
          schoolId,
          groupId,
          room.id,
          teacherId,
          directorId,
          startAt,
          endAt,
          weekOffset < 0 ? "COMPLETED" : "PLANNED",
          weekOffset < 0 ? "Powtórka i konwersacje — demo" : "English in action — demo",
        ],
      );
      scheduleSlotCount += 1;

      if (weekOffset < 0) {
        const enrollmentResult = await client.query(
          `SELECT "studentId" FROM "Enrollment"
           WHERE "groupId" = $1 AND "status" = 'ACTIVE'
           ORDER BY "joinedAt" ASC LIMIT 5`,
          [groupId],
        );
        for (const [studentIndex, row] of enrollmentResult.rows.entries()) {
          const attendanceStatus = studentIndex === 3 ? "ABSENT" : studentIndex === 4 ? "LATE" : "PRESENT";
          await client.query(
            `INSERT INTO "AttendanceRecord" (
               "id", "schoolId", "scheduleSlotId", "studentId", "recordedById",
               "status", "note", "createdAt", "updatedAt"
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
             ON CONFLICT ("scheduleSlotId", "studentId") DO UPDATE SET
               "recordedById" = EXCLUDED."recordedById", "status" = EXCLUDED."status",
               "note" = EXCLUDED."note", "updatedAt" = NOW()`,
            [
              randomUUID(),
              schoolId,
              slotId,
              row.studentId,
              teacherId,
              attendanceStatus,
              studentIndex === 4 ? "Syntetyczny przykład spóźnienia" : null,
            ],
          );
        }
      }
    }
  }

  const pdfBytes = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
  );
  const documentHash = createHash("sha256").update(pdfBytes).digest("hex");
  const storageKey = `${schoolId}/2026/08/${stableUuid(990)}`;
  const storageRoot = path.resolve(process.env.KLA_PRIVATE_FILES_DIR ?? ".data/private-files");
  const documentPath = path.join(storageRoot, storageKey);
  await mkdir(path.dirname(documentPath), { recursive: true, mode: 0o700 });
  await access(documentPath).catch(() => writeFile(documentPath, pdfBytes, { mode: 0o600 }));
  const storedFileResult = await client.query(
    `INSERT INTO "StoredFile" (
       "id", "schoolId", "uploadedById", "storageKey", "originalName", "mimeType",
       "sizeBytes", "sha256", "purpose", "createdAt"
     ) VALUES ($1, $2, $3, $4, 'KLA-umowa-demo.pdf', 'application/pdf', $5, $6, 'CONTRACT', NOW())
     ON CONFLICT ("storageKey") DO UPDATE SET
       "sizeBytes" = EXCLUDED."sizeBytes", "sha256" = EXCLUDED."sha256", "archivedAt" = NULL
     RETURNING "id"`,
    [stableUuid(991), schoolId, directorId, storageKey, pdfBytes.length, documentHash],
  );
  const storedFileId = storedFileResult.rows[0].id;
  const contractStudents = [panelStudentId, ...syntheticStudentIds.slice(0, 2)];
  const paymentStatuses = ["OVERDUE", "PENDING", "PAID"];
  const dueOffsets = [-7, 5, 21];
  for (const [index, studentId] of contractStudents.entries()) {
    const contractId = stableUuid(1000 + index);
    const versionId = stableUuid(1010 + index);
    const assignmentId = stableUuid(1020 + index);
    await client.query(
      `INSERT INTO "Contract" (
         "id", "schoolId", "title", "acceptanceMode", "serviceSummary",
         "requiresPayment", "paymentSummary", "createdAt", "updatedAt"
       ) VALUES ($1, $2, $3, 'DOCUMENTARY', $4, true, $5, NOW(), NOW())
       ON CONFLICT ("id") DO UPDATE SET "title" = EXCLUDED."title", "archivedAt" = NULL, "updatedAt" = NOW()`,
      [
        contractId,
        schoolId,
        `Umowa demonstracyjna ${index + 1}`,
        "Syntetyczny przykład umowy na zajęcia języka angielskiego.",
        "Przykładowa miesięczna opłata demonstracyjna.",
      ],
    );
    await client.query(
      `INSERT INTO "ContractVersion" (
         "id", "contractId", "storedFileId", "createdById", "version", "sha256",
         "title", "acceptanceMode", "serviceSummary", "requiresPayment",
         "paymentSummary", "paymentAmountCents", "paymentLabel", "paymentDueDate", "createdAt"
       ) VALUES ($1, $2, $3, $4, 1, $5, $6, 'DOCUMENTARY', $7, true, $8, $9, $10, CURRENT_DATE + $11::integer, NOW())
       ON CONFLICT ("contractId", "version") DO UPDATE SET
         "storedFileId" = EXCLUDED."storedFileId", "sha256" = EXCLUDED."sha256",
         "paymentDueDate" = EXCLUDED."paymentDueDate"
       RETURNING "id"`,
      [
        versionId,
        contractId,
        storedFileId,
        directorId,
        documentHash,
        `Umowa demonstracyjna ${index + 1}`,
        "Syntetyczny przykład umowy na zajęcia języka angielskiego.",
        "Przykładowa miesięczna opłata demonstracyjna.",
        35000 + index * 2500,
        `Czesne demonstracyjne ${index + 1}`,
        dueOffsets[index],
      ],
    );
    await client.query(
      `INSERT INTO "ContractAssignment" (
         "id", "schoolId", "contractId", "versionId", "parentId", "studentId",
         "status", "sentAt", "viewedAt", "createdAt"
       ) VALUES ($1, $2, $3, $4, $5, $6, 'ACCEPTED', NOW(), NOW(), NOW())
       ON CONFLICT ("versionId", "parentId", "studentId") DO UPDATE SET
         "status" = 'ACCEPTED', "viewedAt" = NOW(), "expiresAt" = NULL
       RETURNING "id"`,
      [assignmentId, schoolId, contractId, versionId, parentId, studentId],
    );
    await client.query(
      `INSERT INTO "ContractAcceptance" (
         "id", "assignmentId", "acceptedById", "documentHash", "evidence", "acceptedAt"
       ) VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
       ON CONFLICT ("assignmentId") DO UPDATE SET "documentHash" = EXCLUDED."documentHash"`,
      [stableUuid(1030 + index), assignmentId, parentId, documentHash, JSON.stringify({ synthetic: true })],
    );
    await client.query(
      `INSERT INTO "PaymentRecord" (
         "id", "schoolId", "studentId", "changedById", "contractAssignmentId",
         "period", "status", "dueDate", "note", "createdAt", "updatedAt"
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE + $8::integer, $9, NOW(), NOW())
       ON CONFLICT ("contractAssignmentId") DO UPDATE SET
         "status" = EXCLUDED."status", "dueDate" = EXCLUDED."dueDate",
         "changedById" = EXCLUDED."changedById", "updatedAt" = NOW()`,
      [
        stableUuid(1040 + index),
        schoolId,
        studentId,
        directorId,
        assignmentId,
        `DEMO-${index + 1}`,
        paymentStatuses[index],
        dueOffsets[index],
        "Syntetyczny status do testów interfejsu.",
      ],
    );
  }

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
        scheduleSlots: scheduleSlotCount,
        contracts: contractStudents.length,
      }),
    ],
  );

  await client.query("COMMIT");
  console.log(
    `Dane demo gotowe: ${demoGroups.length} grup, ${
      studentSequence - 1
    } syntetycznych uczniów, ${scheduleSlotCount} lekcji, rozmowy, obecności, umowy i płatności.`,
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
