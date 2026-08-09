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

  console.log(
    `Dane demo gotowe: ${demoGroups.length} grup z wymaganiami grafiku, ${studentSequence} syntetycznych uczniów i 4 konta ról.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
