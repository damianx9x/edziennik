import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  CefrLevel,
  PrismaClient,
  UserStatus,
} from "../app/generated/prisma/client";
import { auth } from "../lib/server/auth";
import type { IdentityRole } from "../modules/identity/auth/access";
import { demoGroups } from "../modules/demo-data/groups";

const connectionString = process.env.DATABASE_URL;
const demoPassword = process.env.KLA_DEMO_PASSWORD;

if (!connectionString) {
  throw new Error(
    "Brak DATABASE_URL. Uzupełnij .env przed uruchomieniem danych demo.",
  );
}

if (!demoPassword || demoPassword.length < 12) {
  throw new Error(
    "Brak KLA_DEMO_PASSWORD (minimum 12 znaków). Uzupełnij lokalny .env.",
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
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  let userId = existing?.id;
  if (!userId) {
    const created = await auth.api.createUser({
      body: {
        email: input.email,
        password: demoPassword,
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

  return prisma.user.update({
    where: { id: userId },
    data: {
      schoolId: input.schoolId,
      name: input.name,
      role: input.role,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });
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

  await ensureDemoAccount({
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

  let studentSequence = 1;
  let firstGroupId: string | null = null;

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
        name: `KLA ${groupDefinition.name} ${groupDefinition.classLabel} ${groupDefinition.schoolYear}`,
        cefrLevel: CefrLevel.MIXED,
      },
    });
    firstGroupId ??= group.id;

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

  console.log(
    `Dane demo gotowe: ${demoGroups.length} grup, ${studentSequence} syntetycznych uczniów i 4 konta ról.`,
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
