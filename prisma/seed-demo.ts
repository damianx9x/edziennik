import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

import {
  CefrLevel,
  PrismaClient,
  UserStatus,
} from "../app/generated/prisma/client";
import { auth } from "../lib/server/auth";
import type { IdentityRole } from "../modules/identity/auth/access";
import { demoGroups } from "../modules/demo-data/groups";
import { getFileStorage } from "../modules/files/storage";

const connectionString = process.env.DATABASE_URL;
const allowInsecureDemoCredentials =
  process.env.KLA_ALLOW_INSECURE_DEMO_CREDENTIALS === "1";
const fallbackDemoPassword = process.env.KLA_DEMO_PASSWORD;
const demoPasswords: Record<IdentityRole, string | undefined> = {
  DIRECTOR: process.env.KLA_DEMO_DIRECTOR_PASSWORD ?? fallbackDemoPassword,
  TEACHER: process.env.KLA_DEMO_TEACHER_PASSWORD ?? fallbackDemoPassword,
  PARENT: process.env.KLA_DEMO_PARENT_PASSWORD ?? fallbackDemoPassword,
  STUDENT: process.env.KLA_DEMO_STUDENT_PASSWORD ?? fallbackDemoPassword,
  SYSTEM_OWNER: process.env.KLA_SYSTEM_OWNER_PASSWORD,
};

if (!connectionString) {
  throw new Error(
    "Brak DATABASE_URL. Uzupełnij .env przed uruchomieniem danych demo.",
  );
}

if (
  ["DIRECTOR", "TEACHER", "PARENT", "STUDENT"].some((role) => {
    const password = demoPasswords[role as IdentityRole];
    return !password || (!allowInsecureDemoCredentials && password.length < 12);
  })
) {
  throw new Error(
    "Brak haseł kont demo (minimum 12 znaków poza jawnym trybem demonstracyjnym). Uzupełnij lokalny .env.",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function ensureDemoAccount(input: {
  schoolId: string;
  email: string;
  name: string;
  role: IdentityRole;
}) {
  const password = demoPasswords[input.role];
  if (!password) throw new Error(`Brak hasła demo dla roli ${input.role}.`);
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  let userId = existing?.id;
  if (!userId) {
    const created = await auth.api.createUser({
      body: {
        email: input.email,
        password,
        name: input.name,
        role: input.role,
        data: {
          schoolId: input.schoolId,
          status: "ACTIVE",
        },
      },
    });
    userId = created.user.id;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      schoolId: input.schoolId,
      name: input.name,
      role: input.role,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });
  const credential = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { id: true },
  });
  if (credential) {
    await prisma.account.update({
      where: { id: credential.id },
      data: { password: await hashPassword(password) },
    });
  }
  return user;
}

async function main() {
  const school = await prisma.school.upsert({
    where: { slug: "kings-language-academy-demo" },
    update: { name: "King’s Language Academy — DEMO" },
    create: {
      name: "King’s Language Academy — DEMO",
      slug: "kings-language-academy-demo",
    },
  });

  const director = await ensureDemoAccount({
    schoolId: school.id,
    email: "dyrektor.demo@invalid.example",
    name: "Dyrektor Demo",
    role: "DIRECTOR",
  });
  const teacher = await ensureDemoAccount({
    schoolId: school.id,
    email: "wykladowca.demo@invalid.example",
    name: "Wykładowca Demo",
    role: "TEACHER",
  });
  const parent = await ensureDemoAccount({
    schoolId: school.id,
    email: "rodzic.demo@invalid.example",
    name: "Rodzic Demo",
    role: "PARENT",
  });
  const panelStudent = await ensureDemoAccount({
    schoolId: school.id,
    email: "uczen.panel.demo@invalid.example",
    name: "Uczeń Panel Demo",
    role: "STUDENT",
  });
  const locationDefinitions = [
    "Przodkowo",
    "Czeczewo",
    "Wilanowo",
    "Gdańsk Nowatorów",
    "Gdańsk Morena",
    "Gdańsk Niedźwiednik",
    "Gdynia Pogórze",
    "Online",
  ];
  const demoLocations = await Promise.all(
    locationDefinitions.map((name) =>
      prisma.location.upsert({
        where: { schoolId_name: { schoolId: school.id, name } },
        update: {
          isOnline: name === "Online",
          isActive: true,
          archivedAt: null,
        },
        create: {
          schoolId: school.id,
          name,
          isOnline: name === "Online",
        },
      }),
    ),
  );
  const primaryLocation = demoLocations[0];

  let studentSequence = 1;
  let firstGroupId: string | null = null;
  const demoGroupIds: string[] = [];
  const syntheticStudentIds: string[] = [];

  for (const groupDefinition of demoGroups) {
    const group = await prisma.courseGroup.upsert({
      where: {
        schoolId_name: {
          schoolId: school.id,
          name: `KLA ${groupDefinition.name} ${groupDefinition.classLabel} ${groupDefinition.schoolYear}`,
        },
      },
      update: { isActive: true },
      create: {
        schoolId: school.id,
        locationId: primaryLocation.id,
        name: `KLA ${groupDefinition.name} ${groupDefinition.classLabel} ${groupDefinition.schoolYear}`,
        cefrLevel: CefrLevel.MIXED,
      },
    });
    firstGroupId ??= group.id;
    demoGroupIds.push(group.id);

    for (let index = 0; index < groupDefinition.studentCount; index += 1) {
      const sequence = String(studentSequence).padStart(3, "0");
      const student = await prisma.user.upsert({
        where: { email: `uczen.demo.${sequence}@invalid.example` },
        update: {},
        create: {
          schoolId: school.id,
          email: `uczen.demo.${sequence}@invalid.example`,
          name: `Uczeń Demo ${sequence}`,
          role: "STUDENT",
          status: UserStatus.ACTIVE,
          emailVerified: true,
          studentProfile: { create: {} },
        },
      });

      await prisma.enrollment.upsert({
        where: {
          groupId_studentId: {
            groupId: group.id,
            studentId: student.id,
          },
        },
        update: {},
        create: {
          groupId: group.id,
          studentId: student.id,
        },
      });
      syntheticStudentIds.push(student.id);
      studentSequence += 1;
    }
  }

  if (firstGroupId) {
    await prisma.groupTeacher.upsert({
      where: {
        groupId_teacherId: {
          groupId: firstGroupId,
          teacherId: teacher.id,
        },
      },
      update: { isPrimary: true },
      create: {
        groupId: firstGroupId,
        teacherId: teacher.id,
        isPrimary: true,
      },
    });
    await prisma.enrollment.upsert({
      where: {
        groupId_studentId: {
          groupId: firstGroupId,
          studentId: panelStudent.id,
        },
      },
      update: { status: "ACTIVE" },
      create: {
        groupId: firstGroupId,
        studentId: panelStudent.id,
      },
    });

    const conversation = await prisma.conversation.upsert({
      where: { groupId: firstGroupId },
      update: {},
      create: { schoolId: school.id, groupId: firstGroupId },
    });
    const welcome = await prisma.message.upsert({
      where: { authorId_clientRequestId: { authorId: director.id, clientRequestId: "00000000-0000-4000-8000-000000000501:first" } },
      update: {},
      create: {
        schoolId: school.id,
        conversationId: conversation.id,
        authorId: director.id,
        kind: "ANNOUNCEMENT",
        subject: "Witamy w rozmowie grupy",
        body: "Tutaj szkoła przekazuje najważniejsze informacje organizacyjne. Rozmowa służy całej grupie — prywatne sprawy zgłaszaj bezpośrednio do sekretariatu.",
        clientRequestId: "00000000-0000-4000-8000-000000000501:first",
      },
    });
    const teacherMessage = await prisma.message.upsert({
      where: { authorId_clientRequestId: { authorId: teacher.id, clientRequestId: "00000000-0000-4000-8000-000000000502" } },
      update: {},
      create: {
        schoolId: school.id,
        conversationId: conversation.id,
        authorId: teacher.id,
        body: "Dzień dobry! Na kolejne zajęcia proszę przynieść zeszyt i powtórzyć słownictwo z ostatniej lekcji.",
        clientRequestId: "00000000-0000-4000-8000-000000000502",
      },
    });
    await prisma.messageRead.createMany({
      data: [
        { schoolId: school.id, messageId: welcome.id, userId: director.id },
        { schoolId: school.id, messageId: welcome.id, userId: teacher.id },
        { schoolId: school.id, messageId: teacherMessage.id, userId: teacher.id },
        { schoolId: school.id, messageId: teacherMessage.id, userId: parent.id },
      ],
      skipDuplicates: true,
    });
    await prisma.emailDelivery.createMany({
      data: [parent.id, panelStudent.id].flatMap((recipientId) => [welcome.id, teacherMessage.id].map((messageId) => ({
        schoolId: school.id,
        messageId,
        recipientId,
        idempotencyKey: `demo:${messageId}:${recipientId}`,
        status: "SENT" as const,
        attempts: 1,
        sentAt: new Date(),
      }))),
      skipDuplicates: true,
    });
  }

  await prisma.parentChild.upsert({
    where: {
      parentId_childId: {
        parentId: parent.id,
        childId: panelStudent.id,
      },
    },
    update: { schoolId: school.id },
    create: {
      schoolId: school.id,
      parentId: parent.id,
      childId: panelStudent.id,
    },
  });

  await prisma.teacherProfile.upsert({
    where: { userId: teacher.id },
    update: { displayName: "Wykładowca Demo" },
    create: {
      userId: teacher.id,
      displayName: "Wykładowca Demo",
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: panelStudent.id },
    update: {},
    create: { userId: panelStudent.id },
  });

  const demoRooms = await Promise.all(
    [
      { name: "Cambridge", capacity: 8, locationId: demoLocations[0].id },
      { name: "Oxford", capacity: 8, locationId: demoLocations[4].id },
      { name: "Online", capacity: 8, locationId: demoLocations[7].id },
    ].map((room) =>
      prisma.room.upsert({
        where: {
          schoolId_name: {
            schoolId: school.id,
            name: room.name,
          },
        },
        update: {
          capacity: room.capacity,
          locationId: room.locationId,
          isActive: true,
          archivedAt: null,
        },
        create: {
          schoolId: school.id,
          locationId: room.locationId,
          name: room.name,
          capacity: room.capacity,
        },
      }),
    ),
  );

  for (const [index, groupId] of demoGroupIds.entries()) {
    const preferredRoom = demoRooms[index % demoRooms.length];
    await prisma.courseGroup.update({
      where: { id: groupId },
      data: { locationId: preferredRoom.locationId },
    });
    await prisma.groupTeacher.upsert({
      where: {
        groupId_teacherId: {
          groupId,
          teacherId: teacher.id,
        },
      },
      update: { archivedAt: null, isPrimary: true },
      create: {
        groupId,
        teacherId: teacher.id,
        isPrimary: true,
      },
    });
    await prisma.schedulingRequirement.upsert({
      where: { groupId },
      update: {
        schoolId: school.id,
        teacherId: teacher.id,
        preferredRoomId: preferredRoom.id,
        isActive: true,
      },
      create: {
        schoolId: school.id,
        groupId,
        teacherId: teacher.id,
        preferredRoomId: preferredRoom.id,
        lessonsPerWeek: 2,
        durationMinutes: 60,
        allowedWeekdays: [1, 2, 3, 4, 5],
        preferredWeekdays: [(index % 5) + 1],
        earliestStartMinute: 15 * 60,
        latestEndMinute: 20 * 60,
        preferredStartMinute: (15 + (index % 4)) * 60,
      },
    });
  }

  const additionalTeachers = await Promise.all(
    ["Wykładowca Demo 02", "Wykładowca Demo 03", "Wykładowca Demo 04"].map(
      async (name, index) => {
        const user = await prisma.user.upsert({
          where: { email: `wykladowca.demo.${index + 2}@invalid.example` },
          update: { schoolId: school.id, name, status: "ACTIVE", archivedAt: null },
          create: {
            schoolId: school.id,
            email: `wykladowca.demo.${index + 2}@invalid.example`,
            name,
            role: "TEACHER",
            status: "ACTIVE",
            emailVerified: true,
          },
        });
        await prisma.teacherProfile.upsert({
          where: { userId: user.id },
          update: { displayName: name },
          create: { userId: user.id, displayName: name },
        });
        return user;
      },
    ),
  );

  const demoParents = [parent];
  for (let index = 1; index <= 6; index += 1) {
    const name = `Rodzic Demo ${String(index + 1).padStart(2, "0")}`;
    demoParents.push(
      await prisma.user.upsert({
        where: { email: `rodzic.demo.${index + 1}@invalid.example` },
        update: { schoolId: school.id, name, status: "ACTIVE", archivedAt: null },
        create: {
          schoolId: school.id,
          email: `rodzic.demo.${index + 1}@invalid.example`,
          name,
          role: "PARENT",
          status: "ACTIVE",
          emailVerified: true,
        },
      }),
    );
  }

  const parentLinks = [panelStudent.id, ...syntheticStudentIds.slice(0, 8)];
  for (const [index, childId] of parentLinks.entries()) {
    const linkedParent = index < 3 ? parent : demoParents[(index % 6) + 1];
    await prisma.parentChild.upsert({
      where: { parentId_childId: { parentId: linkedParent.id, childId } },
      update: { schoolId: school.id, archivedAt: null },
      create: { schoolId: school.id, parentId: linkedParent.id, childId },
    });
  }

  const weekStart = startOfWeek(new Date());
  const slotIds: string[] = [];
  for (const [index, groupId] of demoGroupIds.entries()) {
    const room = demoRooms[index % demoRooms.length];
    const teacherForGroup =
      index < 4 ? teacher : additionalTeachers[(index - 4) % additionalTeachers.length];
    await prisma.groupTeacher.upsert({
      where: { groupId_teacherId: { groupId, teacherId: teacherForGroup.id } },
      update: { archivedAt: null, isPrimary: index < 4 },
      create: { groupId, teacherId: teacherForGroup.id, isPrimary: index < 4 },
    });

    for (const weekOffset of [-1, 0, 1]) {
      const startAt = new Date(weekStart);
      startAt.setDate(startAt.getDate() + weekOffset * 7 + (index % 5));
      startAt.setHours(14 + Math.floor(index / 5) * 2, (index % 2) * 15, 0, 0);
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
      const slotId = stableUuid(100 + (weekOffset + 1) * 20 + index);
      const slot = await prisma.scheduleSlot.upsert({
        where: { id: slotId },
        update: {
          schoolId: school.id,
          groupId,
          roomId: room.id,
          teacherId: teacherForGroup.id,
          startAt,
          endAt,
          status: weekOffset < 0 ? "COMPLETED" : "PLANNED",
          archivedAt: null,
          topic: weekOffset < 0 ? "Powtórka i konwersacje — demo" : "English in action — demo",
        },
        create: {
          id: slotId,
          schoolId: school.id,
          groupId,
          roomId: room.id,
          teacherId: teacherForGroup.id,
          createdById: director.id,
          startAt,
          endAt,
          status: weekOffset < 0 ? "COMPLETED" : "PLANNED",
          topic: weekOffset < 0 ? "Powtórka i konwersacje — demo" : "English in action — demo",
        },
      });
      slotIds.push(slot.id);

      if (weekOffset < 0) {
        const enrolled = await prisma.enrollment.findMany({
          where: { groupId, status: "ACTIVE" },
          take: 5,
          orderBy: { joinedAt: "asc" },
          select: { studentId: true },
        });
        for (const [studentIndex, enrollment] of enrolled.entries()) {
          await prisma.attendanceRecord.upsert({
            where: {
              scheduleSlotId_studentId: {
                scheduleSlotId: slot.id,
                studentId: enrollment.studentId,
              },
            },
            update: {
              recordedById: teacherForGroup.id,
              status: studentIndex === 3 ? "ABSENT" : studentIndex === 4 ? "LATE" : "PRESENT",
            },
            create: {
              schoolId: school.id,
              scheduleSlotId: slot.id,
              studentId: enrollment.studentId,
              recordedById: teacherForGroup.id,
              status: studentIndex === 3 ? "ABSENT" : studentIndex === 4 ? "LATE" : "PRESENT",
              note: studentIndex === 4 ? "Syntetyczny przykład spóźnienia" : null,
            },
          });
        }
      }
    }

    const conversation = await prisma.conversation.upsert({
      where: { groupId },
      update: { schoolId: school.id, archivedAt: null },
      create: { schoolId: school.id, groupId },
    });
    const groupMessage = await prisma.message.upsert({
      where: {
        authorId_clientRequestId: {
          authorId: teacherForGroup.id,
          clientRequestId: `00000000-0000-4000-8100-${String(index + 1).padStart(12, "0")}`,
        },
      },
      update: { requiresAcknowledgement: index % 3 === 0 },
      create: {
        schoolId: school.id,
        conversationId: conversation.id,
        authorId: teacherForGroup.id,
        body: `Wiadomość demonstracyjna dla grupy ${index + 1}: proszę sprawdzić plan najbliższych zajęć.`,
        clientRequestId: `00000000-0000-4000-8100-${String(index + 1).padStart(12, "0")}`,
        requiresAcknowledgement: index % 3 === 0,
      },
    });
    await prisma.messageRead.createMany({
      data: [{ schoolId: school.id, messageId: groupMessage.id, userId: teacherForGroup.id }],
      skipDuplicates: true,
    });
  }

  await seedDemoContracts({
    schoolId: school.id,
    directorId: director.id,
    parentId: parent.id,
    studentIds: [panelStudent.id, ...syntheticStudentIds.slice(0, 2)],
  });

  await prisma.auditLog.create({
    data: {
      schoolId: school.id,
      actorId: director.id,
      action: "demo.seed.expanded",
      entityType: "School",
      entityId: school.id,
      metadata: {
        synthetic: true,
        groups: demoGroupIds.length,
        parents: demoParents.length,
        teachers: additionalTeachers.length + 1,
        scheduleSlots: slotIds.length,
      },
    },
  });

  console.log(
    `Dane demo gotowe: ${demoGroups.length} grup, ${studentSequence - 1} syntetycznych uczniów, ${slotIds.length} lekcji, rozmowy, obecności, umowy i płatności.`,
  );
}

function startOfWeek(value: Date) {
  const date = new Date(value);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

function stableUuid(value: number) {
  return `10000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
}

async function seedDemoContracts(input: {
  schoolId: string;
  directorId: string;
  parentId: string;
  studentIds: string[];
}) {
  const storage = getFileStorage();
  const pdfBytes = new TextEncoder().encode(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
  );
  let storedFile = await prisma.storedFile.findFirst({
    where: {
      schoolId: input.schoolId,
      purpose: "CONTRACT",
      originalName: "KLA-umowa-demo.pdf",
      archivedAt: null,
    },
  });
  const stored = storedFile
    ? await storage.read(storedFile.storageKey).then(() => null).catch(() => storage.put({ schoolId: input.schoolId, bytes: pdfBytes }))
    : await storage.put({ schoolId: input.schoolId, bytes: pdfBytes });
  if (!storedFile && stored) {
    storedFile = await prisma.storedFile.create({
      data: {
        schoolId: input.schoolId,
        uploadedById: input.directorId,
        storageKey: stored.storageKey,
        originalName: "KLA-umowa-demo.pdf",
        mimeType: "application/pdf",
        sizeBytes: stored.sizeBytes,
        sha256: stored.sha256,
        purpose: "CONTRACT",
      },
    });
  } else if (storedFile && stored) {
    storedFile = await prisma.storedFile.update({
      where: { id: storedFile.id },
      data: {
        storageKey: stored.storageKey,
        sizeBytes: stored.sizeBytes,
        sha256: stored.sha256,
      },
    });
  }
  if (!storedFile) throw new Error("Nie udało się przygotować pliku umowy demo.");

  const dueOffsets = [-7, 5, 21];
  const statuses = ["OVERDUE", "PENDING", "PAID"] as const;
  for (const [index, studentId] of input.studentIds.entries()) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueOffsets[index]);
    dueDate.setHours(12, 0, 0, 0);
    const contractId = stableUuid(300 + index);
    const contract = await prisma.contract.upsert({
      where: { id: contractId },
      update: {
        title: `Umowa demonstracyjna ${index + 1}`,
        archivedAt: null,
      },
      create: {
        id: contractId,
        schoolId: input.schoolId,
        title: `Umowa demonstracyjna ${index + 1}`,
        serviceSummary: "Syntetyczny przykład umowy na zajęcia języka angielskiego.",
        requiresPayment: true,
        paymentSummary: "Przykładowa miesięczna opłata demonstracyjna.",
      },
    });
    const version = await prisma.contractVersion.upsert({
      where: { contractId_version: { contractId: contract.id, version: 1 } },
      update: {
        storedFileId: storedFile.id,
        sha256: storedFile.sha256,
        paymentDueDate: dueDate,
      },
      create: {
        contractId: contract.id,
        storedFileId: storedFile.id,
        createdById: input.directorId,
        version: 1,
        sha256: storedFile.sha256,
        title: contract.title,
        serviceSummary: contract.serviceSummary,
        requiresPayment: true,
        paymentSummary: contract.paymentSummary,
        paymentAmountCents: 35000 + index * 2500,
        paymentLabel: `Czesne demonstracyjne ${index + 1}`,
        paymentDueDate: dueDate,
      },
    });
    const assignment = await prisma.contractAssignment.upsert({
      where: {
        versionId_parentId_studentId: {
          versionId: version.id,
          parentId: input.parentId,
          studentId,
        },
      },
      update: { status: "ACCEPTED", viewedAt: new Date(), expiresAt: null },
      create: {
        schoolId: input.schoolId,
        contractId: contract.id,
        versionId: version.id,
        parentId: input.parentId,
        studentId,
        status: "ACCEPTED",
        viewedAt: new Date(),
      },
    });
    await prisma.contractAcceptance.upsert({
      where: { assignmentId: assignment.id },
      update: { documentHash: storedFile.sha256 },
      create: {
        assignmentId: assignment.id,
        acceptedById: input.parentId,
        documentHash: storedFile.sha256,
        evidence: { synthetic: true, statementVersion: "demo" },
      },
    });
    await prisma.paymentRecord.upsert({
      where: { contractAssignmentId: assignment.id },
      update: { status: statuses[index], dueDate, changedById: input.directorId },
      create: {
        schoolId: input.schoolId,
        studentId,
        changedById: input.directorId,
        contractAssignmentId: assignment.id,
        period: `DEMO-${index + 1}`,
        status: statuses[index],
        dueDate,
        note: "Syntetyczny status do testów interfejsu.",
      },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
