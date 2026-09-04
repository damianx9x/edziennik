import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { createHash } from "node:crypto";

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
const kingaDemoPassword =
  process.env.KLA_DEMO_KINGA_PASSWORD ??
  process.env.KLA_DEMO_DIRECTOR_PASSWORD ??
  fallbackDemoPassword;
const demoSeedMode = process.env.KLA_DEMO_SEED_MODE === "clean" ? "clean" : "rich";
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
  }) ||
  !kingaDemoPassword ||
  (!allowInsecureDemoCredentials && kingaDemoPassword.length < 12)
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
  passwordOverride?: string;
}) {
  const password = input.passwordOverride ?? demoPasswords[input.role];
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
      passwordChangeRequired: false,
      temporaryPasswordExpiresAt: null,
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
  const kinga = await ensureDemoAccount({
    schoolId: school.id,
    email: "kinga.demo@invalid.example",
    name: "Kinga — odbiór klientki",
    role: "DIRECTOR",
    passwordOverride: kingaDemoPassword,
  });
  await prisma.onboardingProgress.deleteMany({ where: { userId: kinga.id } });
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

  if (demoSeedMode === "clean") {
    console.log(
      "Czysta baza odbiorowa gotowa: konta testowe, lokalizacje i puste kartoteki.",
    );
    return;
  }

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

  const allDemoTeachers = [teacher, ...additionalTeachers];
  await prisma.availabilityWindow.deleteMany({
    where: {
      schoolId: school.id,
      teacherId: { in: allDemoTeachers.map((item) => item.id) },
    },
  });
  await prisma.availabilityWindow.createMany({
    data: allDemoTeachers.flatMap((item, teacherIndex) =>
      [1, 2, 3, 4, 5].map((weekday) => ({
        schoolId: school.id,
        teacherId: item.id,
        locationId:
          demoLocations[(weekday + teacherIndex) % (demoLocations.length - 1)]
            .id,
        weekday,
        startMinute: (14 + ((weekday + teacherIndex) % 3)) * 60,
        endMinute: (18 + ((weekday + teacherIndex) % 3)) * 60,
        isAvailable: true,
      })),
    ),
  });

  await prisma.locationTravelRule.deleteMany({ where: { schoolId: school.id } });
  await prisma.locationTravelRule.createMany({
    data: demoLocations
      .filter((location) => !location.isOnline)
      .flatMap((fromLocation, fromIndex, locations) =>
        locations
          .filter((toLocation) => toLocation.id !== fromLocation.id)
          .map((toLocation) => ({
            schoolId: school.id,
            fromLocationId: fromLocation.id,
            toLocationId: toLocation.id,
            minutes: 20 + ((fromIndex + locations.indexOf(toLocation)) % 4) * 10,
            note: "Syntetyczny czas przejazdu do testów asystenta grafiku",
          })),
      ),
  });

  const demoStudentIds = [panelStudent.id, ...syntheticStudentIds];
  await prisma.studentAvailabilityWindow.deleteMany({
    where: { schoolId: school.id, studentId: { in: demoStudentIds } },
  });
  await prisma.studentAvailabilityWindow.createMany({
    data: demoStudentIds.flatMap((studentId, studentIndex) =>
      [1, 2, 3, 4, 5, 6]
        .filter((weekday) => (weekday + studentIndex) % 4 !== 0)
        .map((weekday) => ({
          schoolId: school.id,
          studentId,
          weekday,
          startMinute: (14 + ((weekday + studentIndex) % 2)) * 60,
          endMinute: (19 + ((weekday + studentIndex) % 2)) * 60,
          preference: 10,
          note: "Preferencja ucznia z danych demonstracyjnych",
        })),
    ),
  });

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

  // Ruchoma lekcja demonstracyjna pozwala od razu sprawdzić przypomnienie
  // oraz osobne potwierdzenie przybycia ucznia, bez zmiany oficjalnej obecności.
  const reminderStartAt = new Date(Date.now() + 20 * 60 * 1000);
  reminderStartAt.setSeconds(0, 0);
  const reminderEndAt = new Date(reminderStartAt.getTime() + 60 * 60 * 1000);
  const reminderSlot = await prisma.scheduleSlot.upsert({
    where: { id: stableUuid(199) },
    update: {
      schoolId: school.id,
      groupId: demoGroupIds[0],
      roomId: demoRooms[0].id,
      teacherId: teacher.id,
      startAt: reminderStartAt,
      endAt: reminderEndAt,
      status: "PLANNED",
      archivedAt: null,
      topic: "Speaking warm-up — lekcja przypominająca",
    },
    create: {
      id: stableUuid(199),
      schoolId: school.id,
      groupId: demoGroupIds[0],
      roomId: demoRooms[0].id,
      teacherId: teacher.id,
      createdById: director.id,
      startAt: reminderStartAt,
      endAt: reminderEndAt,
      status: "PLANNED",
      topic: "Speaking warm-up — lekcja przypominająca",
    },
  });
  await prisma.lessonCheckIn.deleteMany({
    where: { scheduleSlotId: reminderSlot.id },
  });
  await prisma.attendanceRecord.deleteMany({
    where: { scheduleSlotId: reminderSlot.id },
  });
  slotIds.push(reminderSlot.id);

  const cancelledSlotId = stableUuid(140);
  const cancelledSlot = await prisma.scheduleSlot.update({
    where: { id: cancelledSlotId },
    data: { status: "CANCELLED" },
    select: { id: true },
  });
  await prisma.lessonCancellation.upsert({
    where: { scheduleSlotId: cancelledSlot.id },
    update: {
      cancelledById: director.id,
      reason: "Zajęcia demonstracyjne odwołane z powodu niedostępności sali.",
      notifyGroup: true,
    },
    create: {
      id: stableUuid(450),
      schoolId: school.id,
      scheduleSlotId: cancelledSlot.id,
      cancelledById: director.id,
      reason: "Zajęcia demonstracyjne odwołane z powodu niedostępności sali.",
      notifyGroup: true,
    },
  });

  const changeRequestSlotId = stableUuid(120);
  await prisma.scheduleChangeRequest.upsert({
    where: { id: stableUuid(451) },
    update: {
      status: "PENDING",
      reason: "Prośba demonstracyjna: przesunięcie zajęć o 30 minut.",
      reviewedById: null,
      reviewedAt: null,
    },
    create: {
      id: stableUuid(451),
      schoolId: school.id,
      scheduleSlotId: changeRequestSlotId,
      requestedById: teacher.id,
      kind: "RESCHEDULE",
      reason: "Prośba demonstracyjna: przesunięcie zajęć o 30 minut.",
      proposedStartAt: new Date(
        (await prisma.scheduleSlot.findUniqueOrThrow({
          where: { id: changeRequestSlotId },
          select: { startAt: true },
        })).startAt.getTime() +
          30 * 60 * 1000,
      ),
      proposedEndAt: new Date(
        (await prisma.scheduleSlot.findUniqueOrThrow({
          where: { id: changeRequestSlotId },
          select: { endAt: true },
        })).endAt.getTime() +
          30 * 60 * 1000,
      ),
    },
  });

  await seedDemoLearningAndProgress({
    schoolId: school.id,
    directorId: director.id,
    teacherId: teacher.id,
    groupId: demoGroupIds[0],
    studentIds: [panelStudent.id, ...syntheticStudentIds.slice(0, 3)],
    completedSlotId: stableUuid(100),
  });

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

function createDemoPdf(title: string, lines: string[]): Uint8Array {
  const escapePdf = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  const text = [
    "BT /F1 18 Tf 72 760 Td",
    `(${escapePdf(title)}) Tj`,
    ...lines.flatMap((line) => ["0 -30 Td", `(${escapePdf(line)}) Tj`]),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

async function seedDemoLearningAndProgress(input: {
  schoolId: string;
  directorId: string;
  teacherId: string;
  groupId: string;
  studentIds: string[];
  completedSlotId: string;
}) {
  const now = new Date();
  const dueSoon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const overdue = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  await prisma.learningMaterial.upsert({
    where: { id: stableUuid(500) },
    update: {
      archivedAt: null,
      publishedAt: now,
      externalUrl:
        "https://learnenglish.britishcouncil.org/grammar/a1-a2-grammar/present-simple",
    },
    create: {
      id: stableUuid(500),
      schoolId: input.schoolId,
      groupId: input.groupId,
      createdById: input.teacherId,
      title: "Powtórka: Present Simple i codzienne czynności",
      description:
        "Krótki materiał demonstracyjny do powtórki przed kolejnymi zajęciami.",
      externalUrl: "https://learnenglish.britishcouncil.org/grammar/a1-a2-grammar/present-simple",
    },
  });
  await prisma.learningMaterial.upsert({
    where: { id: stableUuid(501) },
    update: {
      archivedAt: null,
      publishedAt: now,
      externalUrl: "https://learnenglishkids.britishcouncil.org/category/topics/school",
    },
    create: {
      id: stableUuid(501),
      schoolId: input.schoolId,
      groupId: input.groupId,
      createdById: input.directorId,
      title: "Słownictwo: moja szkoła",
      description:
        "Lista zagadnień do rozmowy na lekcji. Dane są w pełni syntetyczne.",
      externalUrl: "https://learnenglishkids.britishcouncil.org/category/topics/school",
    },
  });

  const currentHomework = await prisma.homeworkAssignment.upsert({
    where: { id: stableUuid(510) },
    update: { archivedAt: null, dueAt: dueSoon },
    create: {
      id: stableUuid(510),
      schoolId: input.schoolId,
      groupId: input.groupId,
      createdById: input.teacherId,
      title: "Napisz pięć zdań o swoim tygodniu",
      instructions:
        "Użyj Present Simple. Pracę możesz opisać w notatce albo dodać jako plik.",
      dueAt: dueSoon,
    },
  });
  const pastHomework = await prisma.homeworkAssignment.upsert({
    where: { id: stableUuid(511) },
    update: { archivedAt: null, dueAt: overdue },
    create: {
      id: stableUuid(511),
      schoolId: input.schoolId,
      groupId: input.groupId,
      createdById: input.teacherId,
      title: "Nagranie: przedstaw się po angielsku",
      instructions:
        "Przygotuj krótką wypowiedź. To zadanie demonstracyjne — nie używaj prawdziwych danych.",
      dueAt: overdue,
    },
  });

  const submissionStatuses = ["SUBMITTED", "REVIEWED", "LATE", "OPENED"] as const;
  for (const [index, studentId] of input.studentIds.entries()) {
    const status = submissionStatuses[index % submissionStatuses.length];
    await prisma.homeworkSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: currentHomework.id,
          studentId,
        },
      },
      update: {
        status,
        studentNote: "Syntetyczna odpowiedź ucznia do testu obiegu zadania.",
        teacherFeedback:
          status === "REVIEWED" ? "Dobra praca. Zwróć uwagę na końcówkę -s." : null,
        reviewedById: status === "REVIEWED" ? input.teacherId : null,
        reviewedAt: status === "REVIEWED" ? now : null,
      },
      create: {
        schoolId: input.schoolId,
        assignmentId: currentHomework.id,
        studentId,
        status,
        studentNote: "Syntetyczna odpowiedź ucznia do testu obiegu zadania.",
        openedAt: now,
        submittedAt:
          status === "SUBMITTED" || status === "REVIEWED" || status === "LATE"
            ? now
            : null,
        teacherFeedback:
          status === "REVIEWED" ? "Dobra praca. Zwróć uwagę na końcówkę -s." : null,
        reviewedById: status === "REVIEWED" ? input.teacherId : null,
        reviewedAt: status === "REVIEWED" ? now : null,
      },
    });
    await prisma.homeworkSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: pastHomework.id,
          studentId,
        },
      },
      update: { status: index === 0 ? "LATE" : "NOT_OPENED" },
      create: {
        schoolId: input.schoolId,
        assignmentId: pastHomework.id,
        studentId,
        status: index === 0 ? "LATE" : "NOT_OPENED",
      },
    });

    for (let point = 0; point < 4; point += 1) {
      const observedAt = new Date(now);
      observedAt.setMonth(observedAt.getMonth() - (3 - point));
      const base = Math.min(5, 2 + point);
      await prisma.studentProgressObservation.upsert({
        where: { id: stableUuid(600 + index * 10 + point) },
        update: {
          speaking: base,
          listening: Math.min(5, base + (index % 2)),
          reading: Math.min(5, base + 1),
          writing: Math.max(1, base - 1),
          vocabulary: base,
          grammar: Math.max(1, base - (point % 2)),
          engagement: 3 + (point % 3),
          observedAt,
        },
        create: {
          id: stableUuid(600 + index * 10 + point),
          schoolId: input.schoolId,
          studentId,
          recordedById: input.teacherId,
          scheduleSlotId: point === 3 && index === 0 ? input.completedSlotId : null,
          speaking: base,
          listening: Math.min(5, base + (index % 2)),
          reading: Math.min(5, base + 1),
          writing: Math.max(1, base - 1),
          vocabulary: base,
          grammar: Math.max(1, base - (point % 2)),
          engagement: 3 + (point % 3),
          note:
            point === 3
              ? "Uczeń coraz swobodniej używa pełnych zdań. Następny krok: regularna powtórka słownictwa."
              : "Syntetyczna obserwacja postępu do testu wykresu.",
          observedAt,
        },
      });
    }
  }
}

async function seedDemoContracts(input: {
  schoolId: string;
  directorId: string;
  parentId: string;
  studentIds: string[];
}) {
  const storage = getFileStorage();
  async function ensurePdf(originalName: string, bytes: Uint8Array) {
    const expectedHash = createHash("sha256").update(bytes).digest("hex");
    const existing = await prisma.storedFile.findFirst({ where: { schoolId: input.schoolId, purpose: "CONTRACT", originalName, archivedAt: null } });
    if (existing?.sha256 === expectedHash) {
      const readable = await storage.read(existing.storageKey).then(() => true).catch(() => false);
      if (readable) return existing;
    }
    const uploaded = await storage.put({ schoolId: input.schoolId, bytes });
    if (!existing) return prisma.storedFile.create({ data: { schoolId: input.schoolId, uploadedById: input.directorId, storageKey: uploaded.storageKey, originalName, mimeType: "application/pdf", sizeBytes: uploaded.sizeBytes, sha256: uploaded.sha256, purpose: "CONTRACT" } });
    const updated = await prisma.storedFile.update({ where: { id: existing.id }, data: { storageKey: uploaded.storageKey, sizeBytes: uploaded.sizeBytes, sha256: uploaded.sha256 } });
    if (existing.storageKey !== uploaded.storageKey) await storage.remove(existing.storageKey).catch(() => undefined);
    return updated;
  }
  const storedFile = await ensurePdf("KLA-umowa-demo.pdf", createDemoPdf("UMOWA NA KURS JEZYKA ANGIELSKIEGO", ["Dokument demonstracyjny - bez danych prawdziwych dzieci.", "Zakres: zajecia w malej grupie King's Language Academy.", "Dane firmy, reklamacje, wypowiedzenie i odstapienie: wzor testowy.", "Informacje RODO: cel, podstawa, odbiorcy, retencja i prawa osoby."]));
  const priceListFile = await ensurePdf("KLA-kosztorys-demo.pdf", createDemoPdf("INDYWIDUALNY KOSZTORYS", ["10 rat po 350,00 PLN.", "Kwota calkowita: 3500,00 PLN.", "Pierwszy termin platnosci: dane testowe.", "Brak platnosci internetowych - status oznacza dyrektor."]));
  const scheduleFile = await ensurePdf("KLA-harmonogram-demo.pdf", createDemoPdf("HARMONOGRAM ZAJEC", ["Rok szkolny 2026/2027 - dokument demonstracyjny.", "Zajecia raz w tygodniu, 60 minut.", "Dokladne daty wynikaja z zalaczonego harmonogramu KLA.", "Zmiany opublikowane sa widoczne w kalendarzu eDziennika."]));
  const packageHash = createHash("sha256").update([
    `AGREEMENT_RODO:${storedFile.sha256}`,
    `PRICE_LIST:${priceListFile.sha256}`,
    `SCHEDULE:${scheduleFile.sha256}`,
  ].join("|")).digest("hex");

  const dueOffsets = [-7, 5, 21];
  const paymentStatuses = ["OVERDUE", "PENDING", "PAID"] as const;
  const contractStatuses = ["VIEWED", "ACCEPTED", "ACCEPTED"] as const;
  for (const [index, studentId] of input.studentIds.entries()) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueOffsets[index]);
    dueDate.setHours(12, 0, 0, 0);
    const serviceStartDate = new Date();
    serviceStartDate.setDate(serviceStartDate.getDate() + (index === 0 ? 3 : -30));
    serviceStartDate.setHours(12, 0, 0, 0);
    const serviceEndDate = new Date(serviceStartDate);
    serviceEndDate.setMonth(serviceEndDate.getMonth() + 9);
    const contractId = stableUuid(300 + index);
    const contract = await prisma.contract.upsert({
      where: { id: contractId },
      update: {
        title: `Umowa demonstracyjna ${index + 1}`,
        acceptanceMode: index === 0 ? "EXTERNAL_SIGNATURE" : "DOCUMENTARY",
        archivedAt: null,
      },
      create: {
        id: contractId,
        schoolId: input.schoolId,
        title: `Umowa demonstracyjna ${index + 1}`,
        acceptanceMode: index === 0 ? "EXTERNAL_SIGNATURE" : "DOCUMENTARY",
        serviceSummary: "Syntetyczny przykład umowy na zajęcia języka angielskiego.",
        requiresPayment: true,
        paymentSummary: "Przykładowa miesięczna opłata demonstracyjna.",
      },
    });
    const version = await prisma.contractVersion.upsert({
      where: { contractId_version: { contractId: contract.id, version: 1 } },
      update: {
        storedFileId: storedFile.id,
        sha256: packageHash,
        paymentDueDate: dueDate,
        serviceStartDate,
        serviceEndDate,
        cancellationSummary: "Miesięczny okres wypowiedzenia ze skutkiem na koniec miesiąca. Przykład demonstracyjny — szczegóły w PDF.",
        requiresEarlyStartRequest: index === 0,
        acceptanceMode: index === 0 ? "EXTERNAL_SIGNATURE" : "DOCUMENTARY",
        installmentCount: 10,
        installmentAmountCents: 35000 + index * 2500,
        totalAmountCents: (35000 + index * 2500) * 10,
      },
      create: {
        contractId: contract.id,
        storedFileId: storedFile.id,
        createdById: input.directorId,
        version: 1,
        sha256: packageHash,
        title: contract.title,
        acceptanceMode: index === 0 ? "EXTERNAL_SIGNATURE" : "DOCUMENTARY",
        serviceSummary: contract.serviceSummary,
        requiresPayment: true,
        paymentSummary: contract.paymentSummary,
        paymentAmountCents: 35000 + index * 2500,
        paymentLabel: `Czesne demonstracyjne ${index + 1}`,
        paymentDueDate: dueDate,
        serviceStartDate,
        serviceEndDate,
        cancellationSummary: "Miesięczny okres wypowiedzenia ze skutkiem na koniec miesiąca. Przykład demonstracyjny — szczegóły w PDF.",
        requiresEarlyStartRequest: index === 0,
        installmentCount: 10,
        installmentAmountCents: 35000 + index * 2500,
        totalAmountCents: (35000 + index * 2500) * 10,
      },
    });
    const demoDocuments = [
      { storedFileId: storedFile.id, kind: "AGREEMENT_RODO" as const, title: "Umowa i informacje RODO", position: 1 },
      { storedFileId: priceListFile.id, kind: "PRICE_LIST" as const, title: "Cennik / kosztorys", position: 2 },
      { storedFileId: scheduleFile.id, kind: "SCHEDULE" as const, title: "Harmonogram zajęć", position: 3 },
    ];
    const contractDocuments = await Promise.all(demoDocuments.map((document) => prisma.contractDocument.upsert({
      where: { versionId_kind: { versionId: version.id, kind: document.kind } },
      update: { storedFileId: document.storedFileId, title: document.title, position: document.position },
      create: { schoolId: input.schoolId, versionId: version.id, ...document },
    })));
    if (index === 0) {
      const previousAssignment = await prisma.contractAssignment.findUnique({
        where: {
          versionId_parentId_studentId: {
            versionId: version.id,
            parentId: input.parentId,
            studentId,
          },
        },
        select: { id: true, signedFileId: true },
      });
      if (previousAssignment) {
        await prisma.contractAcceptance.deleteMany({
          where: { assignmentId: previousAssignment.id },
        });
        await prisma.paymentRecord.deleteMany({
          where: { contractAssignmentId: previousAssignment.id },
        });
        await prisma.contractAssignment.update({
          where: { id: previousAssignment.id },
          data: { signedFileId: null, signedUploadedAt: null },
        });
        if (previousAssignment.signedFileId) {
          await prisma.storedFile.update({
            where: { id: previousAssignment.signedFileId },
            data: { archivedAt: new Date() },
          });
        }
      }
    }
    const assignment = await prisma.contractAssignment.upsert({
      where: {
        versionId_parentId_studentId: {
          versionId: version.id,
          parentId: input.parentId,
          studentId,
        },
      },
      update: {
        status: contractStatuses[index],
        viewedAt: new Date(),
        expiresAt: null,
        ...(index === 0 ? { signedFileId: null, signedUploadedAt: null } : {}),
      },
      create: {
        schoolId: input.schoolId,
        contractId: contract.id,
        versionId: version.id,
        parentId: input.parentId,
        studentId,
        status: contractStatuses[index],
        viewedAt: new Date(),
      },
    });
    await Promise.all(contractDocuments.map((document) => prisma.contractDocumentView.upsert({
      where: { assignmentId_documentId_userId: { assignmentId: assignment.id, documentId: document.id, userId: input.parentId } },
      update: { lastViewedAt: new Date() },
      create: { schoolId: input.schoolId, assignmentId: assignment.id, documentId: document.id, userId: input.parentId },
    })));
    if (contractStatuses[index] === "ACCEPTED") {
      await prisma.contractAcceptance.upsert({
        where: { assignmentId: assignment.id },
        update: { documentHash: packageHash },
        create: {
          assignmentId: assignment.id,
          acceptedById: input.parentId,
          documentHash: packageHash,
          evidence: { synthetic: true, statementVersion: "demo" },
        },
      });
      await prisma.paymentRecord.upsert({
        where: { contractAssignmentId: assignment.id },
        update: { status: paymentStatuses[index], dueDate, changedById: input.directorId },
        create: {
          schoolId: input.schoolId,
          studentId,
          changedById: input.directorId,
          contractAssignmentId: assignment.id,
          period: `DEMO-${index + 1}`,
          status: paymentStatuses[index],
          dueDate,
          note: "Syntetyczny status do testów interfejsu.",
        },
      });
      for (let installmentNumber = 1; installmentNumber <= 10; installmentNumber += 1) {
        const installmentDueDate = new Date(dueDate);
        installmentDueDate.setMonth(installmentDueDate.getMonth() + installmentNumber - 1);
        await prisma.paymentInstallment.upsert({
          where: { assignmentId_installmentNumber: { assignmentId: assignment.id, installmentNumber } },
          update: { amountCents: 35000 + index * 2500, dueDate: installmentDueDate, changedById: input.directorId },
          create: { schoolId: input.schoolId, assignmentId: assignment.id, changedById: input.directorId, installmentNumber, amountCents: 35000 + index * 2500, dueDate: installmentDueDate, status: installmentNumber === 1 ? paymentStatuses[index] : "UNSET", note: "Syntetyczna rata do testów interfejsu." },
        });
      }
    } else {
      await prisma.paymentRecord.deleteMany({ where: { contractAssignmentId: assignment.id } });
      await prisma.paymentInstallment.deleteMany({ where: { assignmentId: assignment.id } });
      await prisma.contractAcceptance.deleteMany({ where: { assignmentId: assignment.id } });
    }
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
