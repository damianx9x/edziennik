import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  CefrLevel,
  PrismaClient,
  UserRole,
  UserStatus,
} from "../app/generated/prisma/client";
import { demoGroups } from "../modules/demo-data/groups";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Brak DATABASE_URL. Uzupełnij .env przed uruchomieniem danych demo.",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const school = await prisma.school.upsert({
    where: { slug: "kings-language-academy-demo" },
    update: { name: "King’s Language Academy — DEMO" },
    create: {
      name: "King’s Language Academy — DEMO",
      slug: "kings-language-academy-demo",
    },
  });

  await prisma.user.upsert({
    where: {
      schoolId_email: {
        schoolId: school.id,
        email: "dyrektor.demo@invalid.example",
      },
    },
    update: {},
    create: {
      schoolId: school.id,
      email: "dyrektor.demo@invalid.example",
      name: "Dyrektor Demo",
      role: UserRole.DIRECTOR,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  let studentSequence = 1;

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

    for (let index = 0; index < groupDefinition.studentCount; index += 1) {
      const sequence = String(studentSequence).padStart(3, "0");
      const student = await prisma.user.upsert({
        where: {
          schoolId_email: {
            schoolId: school.id,
            email: `uczen.demo.${sequence}@invalid.example`,
          },
        },
        update: {},
        create: {
          schoolId: school.id,
          email: `uczen.demo.${sequence}@invalid.example`,
          name: `Uczeń Demo ${sequence}`,
          role: UserRole.STUDENT,
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

  console.log(
    `Dane demo gotowe: ${demoGroups.length} grup, ${studentSequence - 1} syntetycznych uczniów.`,
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
