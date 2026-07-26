"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/server/db";
import { can } from "@/modules/access-control/can";
import { requireActiveSession } from "@/modules/identity/auth/session";

import type { RecordUpdateState } from "./state";

const entityTypeSchema = z.enum(["USER", "ROOM", "GROUP"]);
const cefrSchema = z.enum(["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2", "MIXED"]);

const userPayloadSchema = z.object({
  name: z.string().trim().min(2, "Wpisz imię i nazwisko.").max(120),
  email: z
    .string()
    .trim()
    .pipe(z.email("Wpisz poprawny adres e-mail.").max(254))
    .nullable(),
  phone: z.string().trim().max(30).nullable(),
  externalId: z.string().trim().max(80).nullable(),
});

const roomPayloadSchema = z.object({
  name: z.string().trim().min(2, "Wpisz nazwę sali.").max(80),
  capacity: z.number().int().min(1).max(100).nullable(),
});

const groupPayloadSchema = z.object({
  name: z.string().trim().min(2, "Wpisz nazwę grupy.").max(100),
  cefrLevel: cefrSchema,
});

type EntityType = z.infer<typeof entityTypeSchema>;

function nullableValue(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

async function canTeacherEdit(
  actorId: string,
  schoolId: string,
  entityType: EntityType,
  entityId: string,
): Promise<boolean> {
  if (entityType === "ROOM") {
    const room = await db.room.findFirst({
      where: { id: entityId, schoolId, archivedAt: null },
      select: { id: true },
    });
    return Boolean(room);
  }

  if (entityType === "GROUP") {
    const group = await db.courseGroup.findFirst({
      where: { id: entityId, schoolId, archivedAt: null },
      select: {
        teachers: {
          where: { archivedAt: null },
          select: { teacherId: true },
        },
      },
    });
    return Boolean(
      group &&
        can(
          { id: actorId, schoolId, role: "TEACHER" },
          "edit:group",
          {
            schoolId,
            teacherIds: group.teachers.map((item) => item.teacherId),
          },
        ),
    );
  }

  if (entityId === actorId) return true;
  const user = await db.user.findFirst({
    where: { id: entityId, schoolId, archivedAt: null },
    select: {
      role: true,
      enrollments: {
        where: { status: "ACTIVE" },
        select: {
          group: {
            select: {
              teachers: {
                where: { archivedAt: null },
                select: { teacherId: true },
              },
            },
          },
        },
      },
      parentLinks: {
        where: { archivedAt: null },
        select: {
          child: {
            select: {
              enrollments: {
                where: { status: "ACTIVE" },
                select: {
                  group: {
                    select: {
                      teachers: {
                        where: { archivedAt: null },
                        select: { teacherId: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!user) return false;
  const teacherIds =
    user.role === "PARENT"
      ? user.parentLinks.flatMap((link) =>
          link.child.enrollments.flatMap((enrollment) =>
            enrollment.group.teachers.map((teacher) => teacher.teacherId),
          ),
        )
      : user.enrollments.flatMap((enrollment) =>
          enrollment.group.teachers.map((teacher) => teacher.teacherId),
        );
  return teacherIds.includes(actorId);
}

async function currentRecord(
  schoolId: string,
  entityType: EntityType,
  entityId: string,
) {
  if (entityType === "USER") {
    return db.user.findFirst({
      where: { id: entityId, schoolId, archivedAt: null },
      select: { name: true, email: true, phone: true, externalId: true },
    });
  }
  if (entityType === "ROOM") {
    return db.room.findFirst({
      where: { id: entityId, schoolId, archivedAt: null },
      select: { name: true, capacity: true },
    });
  }
  return db.courseGroup.findFirst({
    where: { id: entityId, schoolId, archivedAt: null },
    select: { name: true, cefrLevel: true },
  });
}

function changedFields(
  current: Record<string, unknown>,
  payload: Record<string, unknown>,
): string[] {
  return Object.keys(payload).filter((key) => current[key] !== payload[key]);
}

function parsePayload(entityType: EntityType, formData: FormData) {
  if (entityType === "USER") {
    return userPayloadSchema.safeParse({
      name: formData.get("name"),
      email: nullableValue(formData.get("email")),
      phone: nullableValue(formData.get("phone")),
      externalId: nullableValue(formData.get("externalId")),
    });
  }
  if (entityType === "ROOM") {
    const rawCapacity = nullableValue(formData.get("capacity"));
    return roomPayloadSchema.safeParse({
      name: formData.get("name"),
      capacity: rawCapacity ? Number(rawCapacity) : null,
    });
  }
  return groupPayloadSchema.safeParse({
    name: formData.get("name"),
    cefrLevel: formData.get("cefrLevel"),
  });
}

async function applyUpdate(
  schoolId: string,
  entityType: EntityType,
  entityId: string,
  payload: Record<string, unknown>,
  client: Pick<
    Prisma.TransactionClient,
    "user" | "room" | "courseGroup"
  > = db,
) {
  if (entityType === "USER") {
    return client.user.updateMany({
      where: { id: entityId, schoolId, archivedAt: null },
      data: payload,
    });
  }
  if (entityType === "ROOM") {
    return client.room.updateMany({
      where: { id: entityId, schoolId, archivedAt: null },
      data: payload,
    });
  }
  return client.courseGroup.updateMany({
    where: { id: entityId, schoolId, archivedAt: null },
    data: payload,
  });
}

export async function updateRecordAction(
  _previousState: RecordUpdateState,
  formData: FormData,
): Promise<RecordUpdateState> {
  const session = await requireActiveSession("/panel/szkola/kartoteki");
  if (!["DIRECTOR", "TEACHER"].includes(session.user.role)) {
    return { status: "error", message: "Nie masz dostępu do tej operacji." };
  }
  const entityTypeResult = entityTypeSchema.safeParse(formData.get("entityType"));
  const entityId = String(formData.get("entityId") ?? "");
  if (!entityTypeResult.success || !z.uuid().safeParse(entityId).success) {
    return { status: "error", message: "Nie udało się rozpoznać kartoteki." };
  }
  const entityType = entityTypeResult.data;
  const parsed = parsePayload(entityType, formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Sprawdź wpisane dane.",
    };
  }

  const current = await currentRecord(
    session.user.schoolId,
    entityType,
    entityId,
  );
  if (!current) {
    return { status: "error", message: "Ta kartoteka już nie jest aktywna." };
  }
  const payload = { ...parsed.data } as Record<string, unknown>;
  if (
    entityType === "USER" &&
    payload.email === null &&
    "email" in current
  ) {
    payload.email = current.email;
  }
  const fields = changedFields(current, payload);
  if (fields.length === 0) {
    return { status: "success", message: "Nie ma zmian do zapisania." };
  }

  if (session.user.role === "TEACHER") {
    const allowed = await canTeacherEdit(
      session.user.id,
      session.user.schoolId,
      entityType,
      entityId,
    );
    if (!allowed) {
      return {
        status: "error",
        message: "Możesz proponować zmiany tylko w przypisanych kartotekach.",
      };
    }
    const request = await db.recordChangeRequest.create({
      data: {
        schoolId: session.user.schoolId,
        requestedById: session.user.id,
        entityType,
        entityId,
        payload: payload as Prisma.InputJsonValue,
        changedFields: fields,
      },
      select: { id: true },
    });
    await db.auditLog.create({
      data: {
        schoolId: session.user.schoolId,
        actorId: session.user.id,
        action: "records.change.requested",
        entityType,
        entityId,
        metadata: { requestId: request.id, changedFields: fields },
      },
    });
    revalidatePath("/panel/szkola/kartoteki");
    revalidatePath("/panel/szkola/powiadomienia");
    return {
      status: "success",
      message:
        "Zmiana została wysłana do dyrektora. Do tego czasu dane pozostają bez zmian.",
    };
  }

  try {
    const updated = await applyUpdate(
      session.user.schoolId,
      entityType,
      entityId,
      payload,
    );
    if (updated.count !== 1) {
      return { status: "error", message: "Nie udało się zapisać zmiany." };
    }
    await db.auditLog.create({
      data: {
        schoolId: session.user.schoolId,
        actorId: session.user.id,
        action: "records.change.approved_directly",
        entityType,
        entityId,
        metadata: { changedFields: fields },
      },
    });
    revalidatePath("/panel/szkola/kartoteki");
    return { status: "success", message: "Zmiany zostały zapisane." };
  } catch {
    return {
      status: "error",
      message:
        "Nie udało się zapisać. Sprawdź, czy e-mail, identyfikator lub nazwa nie są już używane.",
    };
  }
}

export async function reviewRecordChangeAction(formData: FormData): Promise<void> {
  const session = await requireActiveSession("/panel/szkola/powiadomienia");
  if (session.user.role !== "DIRECTOR") return;
  const requestId = String(formData.get("requestId") ?? "");
  const decision = formData.get("decision");
  if (!z.uuid().safeParse(requestId).success) return;
  if (decision !== "approve" && decision !== "reject") return;

  await db.$transaction(async (transaction) => {
    const request = await transaction.recordChangeRequest.findFirst({
      where: {
        id: requestId,
        schoolId: session.user.schoolId,
        status: "PENDING",
      },
    });
    if (!request) return;

    if (decision === "approve") {
      const result = await applyUpdate(
        session.user.schoolId,
        request.entityType,
        request.entityId,
        request.payload as Record<string, unknown>,
        transaction,
      );
      if (result.count !== 1) {
        throw new Error("Record no longer active.");
      }
    }
    await transaction.recordChangeRequest.update({
      where: { id: request.id },
      data: {
        status: decision === "approve" ? "APPROVED" : "REJECTED",
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });
    await transaction.auditLog.create({
      data: {
        schoolId: session.user.schoolId,
        actorId: session.user.id,
        action:
          decision === "approve"
            ? "records.change.approved"
            : "records.change.rejected",
        entityType: request.entityType,
        entityId: request.entityId,
        metadata: {
          requestId: request.id,
          changedFields: request.changedFields,
        },
      },
    });
  });
  revalidatePath("/panel/szkola/kartoteki");
  revalidatePath("/panel/szkola/powiadomienia");
}
