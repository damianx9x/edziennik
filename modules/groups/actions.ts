"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/server/db";
import { requireDirector } from "@/modules/identity/auth/session";
import { revalidatePath } from "next/cache";

import {
  archiveRecordSchema,
  createGroupSchema,
  createRoomSchema,
} from "./schema";
import type { RecordActionState } from "./state";

export async function createRoomAction(
  _previousState: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const session = await requireDirector();
  const parsed = createRoomSchema.safeParse({
    name: formData.get("name"),
    capacity: formData.get("capacity"),
  });
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message);
  }

  try {
    const room = await db.room.create({
      data: {
        schoolId: session.user.schoolId,
        name: parsed.data.name,
        capacity: parsed.data.capacity,
      },
      select: { id: true },
    });
    await writeAudit(session.user.schoolId, session.user.id, {
      action: "records.room.created",
      entityType: "Room",
      entityId: room.id,
    });
    revalidateRecords();
    return {
      status: "success",
      message: `Sala „${parsed.data.name}” jest gotowa.`,
    };
  } catch (error) {
    if (isUniqueConstraint(error)) {
      return actionError("Sala o tej nazwie już istnieje.");
    }
    return actionError("Nie udało się dodać sali. Spróbuj ponownie.");
  }
}

export async function createGroupAction(
  _previousState: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const session = await requireDirector();
  const parsed = createGroupSchema.safeParse({
    name: formData.get("name"),
    level: formData.get("level"),
  });
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message);
  }

  try {
    const group = await db.courseGroup.create({
      data: {
        schoolId: session.user.schoolId,
        name: parsed.data.name,
        cefrLevel: parsed.data.level,
      },
      select: { id: true },
    });
    await writeAudit(session.user.schoolId, session.user.id, {
      action: "records.group.created",
      entityType: "CourseGroup",
      entityId: group.id,
    });
    revalidateRecords();
    return {
      status: "success",
      message: `Grupa „${parsed.data.name}” jest gotowa.`,
    };
  } catch (error) {
    if (isUniqueConstraint(error)) {
      return actionError("Grupa o tej nazwie już istnieje.");
    }
    return actionError("Nie udało się dodać grupy. Spróbuj ponownie.");
  }
}

export async function archiveRecordAction(formData: FormData): Promise<void> {
  const session = await requireDirector();
  const parsed = archiveRecordSchema.safeParse({
    recordId: formData.get("recordId"),
    recordType: formData.get("recordType"),
  });
  if (!parsed.success) return;

  const now = new Date();
  let changed: number;
  let entityType: string;
  if (parsed.data.recordType === "room") {
    const result = await db.room.updateMany({
      where: {
        id: parsed.data.recordId,
        schoolId: session.user.schoolId,
        archivedAt: null,
      },
      data: { archivedAt: now, isActive: false },
    });
    changed = result.count;
    entityType = "Room";
  } else if (parsed.data.recordType === "group") {
    const result = await db.courseGroup.updateMany({
      where: {
        id: parsed.data.recordId,
        schoolId: session.user.schoolId,
        archivedAt: null,
      },
      data: { archivedAt: now, isActive: false },
    });
    changed = result.count;
    entityType = "CourseGroup";
  } else {
    const result = await db.user.updateMany({
      where: {
        id: parsed.data.recordId,
        schoolId: session.user.schoolId,
        role: { in: ["TEACHER", "PARENT", "STUDENT"] },
        archivedAt: null,
      },
      data: { archivedAt: now, status: "ARCHIVED" },
    });
    changed = result.count;
    entityType = "User";
  }

  if (changed === 1) {
    await writeAudit(session.user.schoolId, session.user.id, {
      action: "records.record.archived",
      entityType,
      entityId: parsed.data.recordId,
    });
    revalidateRecords();
  }
}

function actionError(message?: string): RecordActionState {
  return {
    status: "error",
    message: message ?? "Sprawdź dane i spróbuj ponownie.",
  };
}

function isUniqueConstraint(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function writeAudit(
  schoolId: string,
  actorId: string,
  event: {
    action: string;
    entityType: string;
    entityId: string;
  },
) {
  await db.auditLog.create({
    data: { schoolId, actorId, ...event },
  });
}

function revalidateRecords() {
  revalidatePath("/panel/szkola");
  revalidatePath("/panel/szkola/kartoteki");
}
