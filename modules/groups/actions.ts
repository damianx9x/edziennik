"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/server/db";
import { requireDirector } from "@/modules/identity/auth/session";
import {
  discardReadyScheduleGenerations,
  lockScheduleResources,
} from "@/modules/schedule/resource-lock";
import { revalidatePath } from "next/cache";

import {
  archiveRecordSchema,
  createGroupSchema,
  createLocationSchema,
  createRoomSchema,
} from "./schema";
import type { RecordActionState } from "./state";

export async function createRoomAction(
  _previousState: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const session = await requireDirector();
  const parsed = createRoomSchema.safeParse({
    locationId: formData.get("locationId"),
    name: formData.get("name"),
    capacity: formData.get("capacity"),
  });
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message);
  }

  try {
    const location = await findLocation(
      session.user.schoolId,
      parsed.data.locationId,
    );
    if (!location) return actionError("Ta lokalizacja nie jest już dostępna.");
    const room = await db.room.create({
      data: {
        schoolId: session.user.schoolId,
        locationId: location.id,
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
    locationId: formData.get("locationId"),
    name: formData.get("name"),
    level: formData.get("level"),
  });
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message);
  }

  try {
    const location = await findLocation(
      session.user.schoolId,
      parsed.data.locationId,
    );
    if (!location) return actionError("Ta lokalizacja nie jest już dostępna.");
    const group = await db.courseGroup.create({
      data: {
        schoolId: session.user.schoolId,
        locationId: location.id,
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

export async function createLocationAction(
  _previousState: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const session = await requireDirector();
  const parsed = createLocationSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    isOnline: formData.get("isOnline") === "on",
  });
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message);
  }

  try {
    const location = await db.location.create({
      data: {
        schoolId: session.user.schoolId,
        name: parsed.data.name,
        address: parsed.data.address,
        isOnline: parsed.data.isOnline,
      },
      select: { id: true },
    });
    await writeAudit(session.user.schoolId, session.user.id, {
      action: "records.location.created",
      entityType: "Location",
      entityId: location.id,
    });
    revalidateRecords();
    revalidatePath("/panel/plan");
    return {
      status: "success",
      message: `Lokalizacja „${parsed.data.name}” jest gotowa.`,
    };
  } catch (error) {
    if (isUniqueConstraint(error)) {
      return actionError("Lokalizacja o tej nazwie już istnieje.");
    }
    return actionError("Nie udało się dodać lokalizacji. Spróbuj ponownie.");
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
  const changed = await db.$transaction(
    async (transaction) => {
      await lockScheduleResources(transaction, session.user.schoolId);
      let changedCount: number;
      let changedEntityType: string;
      if (parsed.data.recordType === "room") {
        const result = await transaction.room.updateMany({
          where: {
            id: parsed.data.recordId,
            schoolId: session.user.schoolId,
            archivedAt: null,
          },
          data: { archivedAt: now, isActive: false },
        });
        changedCount = result.count;
        changedEntityType = "Room";
      } else if (parsed.data.recordType === "group") {
        const result = await transaction.courseGroup.updateMany({
          where: {
            id: parsed.data.recordId,
            schoolId: session.user.schoolId,
            archivedAt: null,
          },
          data: { archivedAt: now, isActive: false },
        });
        changedCount = result.count;
        changedEntityType = "CourseGroup";
      } else {
        const result = await transaction.user.updateMany({
          where: {
            id: parsed.data.recordId,
            schoolId: session.user.schoolId,
            role: { in: ["TEACHER", "PARENT", "STUDENT"] },
            archivedAt: null,
          },
          data: { archivedAt: now, status: "ARCHIVED" },
        });
        changedCount = result.count;
        changedEntityType = "User";
      }

      if (changedCount === 1) {
        const discardedGenerationCount =
          await discardReadyScheduleGenerations(
            transaction,
            session.user.schoolId,
          );
        await transaction.auditLog.create({
          data: {
            schoolId: session.user.schoolId,
            actorId: session.user.id,
            action: "records.record.archived",
            entityType: changedEntityType,
            entityId: parsed.data.recordId,
            metadata: { discardedGenerationCount },
          },
        });
      }
      return changedCount;
    },
  );

  if (changed === 1) {
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

function findLocation(schoolId: string, locationId: string) {
  return db.location.findFirst({
    where: {
      id: locationId,
      schoolId,
      isActive: true,
      archivedAt: null,
    },
    select: { id: true },
  });
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
