"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/server/db";
import type { RecordActionState } from "@/modules/groups/state";
import { requireDirector } from "@/modules/identity/auth/session";
import { revalidatePath } from "next/cache";

import { createRecordOnlyEmail } from "./record-email";
import {
  buildStudentExternalIdBase,
  nextAvailableExternalId,
} from "./external-id";
import { createPersonSchema } from "./schema";

export async function createPersonAction(
  _previousState: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const session = await requireDirector();
  const parsed = createPersonSchema.safeParse({
    role: formData.get("role"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    externalId: formData.get("externalId"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Sprawdź dane osoby i spróbuj ponownie.",
    };
  }

  const name = `${parsed.data.firstName} ${parsed.data.lastName}`;
  let externalId = parsed.data.externalId;
  if (parsed.data.role === "STUDENT" && !externalId) {
    const base = buildStudentExternalIdBase(
      parsed.data.firstName,
      parsed.data.lastName,
    );
    const existing = await db.user.findMany({
      where: {
        schoolId: session.user.schoolId,
        externalId: { startsWith: base },
      },
      select: { externalId: true },
    });
    externalId = nextAvailableExternalId(
      base,
      existing.map((item) => item.externalId),
    );
  }
  const email =
    parsed.data.email ??
    createRecordOnlyEmail(
      session.user.schoolId,
      externalId ?? name,
    );

  try {
    const user = await db.user.create({
      data: {
        schoolId: session.user.schoolId,
        email,
        name,
        role: parsed.data.role,
        status: "INVITED",
        phone: parsed.data.phone,
        externalId,
        teacherProfile:
          parsed.data.role === "TEACHER"
            ? { create: { displayName: name } }
            : undefined,
        studentProfile:
          parsed.data.role === "STUDENT" ? { create: {} } : undefined,
      },
      select: { id: true },
    });

    await db.auditLog.create({
      data: {
        schoolId: session.user.schoolId,
        actorId: session.user.id,
        action: "records.person.created",
        entityType: "User",
        entityId: user.id,
        metadata: { role: parsed.data.role },
      },
    });
    revalidatePath("/panel/szkola");
    revalidatePath("/panel/szkola/kartoteki");
    return {
      status: "success",
      message: `${name} został dodany do kartoteki.`,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        status: "error",
        message:
          "Osoba z tym adresem e-mail lub identyfikatorem już istnieje.",
      };
    }
    return {
      status: "error",
      message: "Nie udało się dodać osoby. Spróbuj ponownie.",
    };
  }
}
