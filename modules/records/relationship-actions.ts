"use server";

import { revalidatePath } from "next/cache";
import { requireEnabledModule } from "@/modules/module-access/server";

import { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/server/db";
import { requireSchoolStaff } from "@/modules/identity/auth/session";
import {
  discardReadyScheduleGenerations,
  lockScheduleResources,
} from "@/modules/schedule/resource-lock";

import { canTeacherEdit } from "./actions";
import {
  relationshipKindLabels,
  relationshipUpdateSchema,
  studentAvailabilityUpdateSchema,
} from "./relationship-schema";
import {
  applyRelationshipDelta,
  applyStudentAvailability,
  getRelationshipIds,
} from "./relationship-service";
import type { RecordUpdateState } from "./state";

function refreshRecords() {
  revalidatePath("/panel/szkola/kartoteki");
  revalidatePath("/panel/szkola/powiadomienia");
  revalidatePath("/panel/plan");
}

export async function updateRelationshipAction(
  _state: RecordUpdateState,
  formData: FormData,
): Promise<RecordUpdateState> {
  const session = await requireSchoolStaff("/panel/szkola/kartoteki");
  await requireEnabledModule(session, "records");
  const parsed = relationshipUpdateSchema.safeParse({
    entityId: formData.get("entityId"),
    relationKind: formData.get("relationKind"),
    selectedIds: formData.getAll("selectedId").filter((value) => value !== ""),
  });
  if (!parsed.success) {
    return { status: "error", message: "Nie udało się odczytać przypisań." };
  }
  const entityType = parsed.data.relationKind.startsWith("GROUP_")
    ? "GROUP"
    : parsed.data.relationKind.startsWith("ROOM_")
      ? "ROOM"
      : "USER";
  if (session.user.role === "TEACHER") {
    const allowed = await canTeacherEdit(
      session.user.id,
      session.user.schoolId,
      entityType,
      parsed.data.entityId,
    );
    if (!allowed) {
      return {
        status: "error",
        message: "Możesz proponować zmiany tylko w przypisanych kartotekach.",
      };
    }
  }
  const changedField = relationshipKindLabels[parsed.data.relationKind];
  if (session.user.role === "TEACHER") {
    const currentIds = await getRelationshipIds(
      db,
      session.user.schoolId,
      parsed.data.relationKind,
      parsed.data.entityId,
    );
    const addIds = parsed.data.selectedIds.filter((id) => !currentIds.includes(id));
    const removeIds = currentIds.filter(
      (id) => !parsed.data.selectedIds.includes(id),
    );
    if (addIds.length === 0 && removeIds.length === 0) {
      return { status: "success", message: "Przypisania są już aktualne." };
    }
    const request = await db.recordChangeRequest.create({
      data: {
        schoolId: session.user.schoolId,
        requestedById: session.user.id,
        entityType,
        entityId: parsed.data.entityId,
        payload: {
          kind: "RELATIONSHIPS",
          relationKind: parsed.data.relationKind,
          addIds,
          removeIds,
        },
        changedFields: [changedField],
      },
    });
    await db.auditLog.create({
      data: {
        schoolId: session.user.schoolId,
        actorId: session.user.id,
        action: "records.change.requested",
        entityType,
        entityId: parsed.data.entityId,
        metadata: { requestId: request.id, changedFields: [changedField] },
      },
    });
    refreshRecords();
    return {
      status: "success",
      message: "Propozycja została wysłana do dyrektora. Obecne przypisania pozostają bez zmian do zatwierdzenia.",
    };
  }
  try {
    const changed = await db.$transaction(async (tx) => {
      await lockScheduleResources(tx, session.user.schoolId);
      const currentIds = await getRelationshipIds(
        tx,
        session.user.schoolId,
        parsed.data.relationKind,
        parsed.data.entityId,
      );
      const addIds = parsed.data.selectedIds.filter((id) => !currentIds.includes(id));
      const removeIds = currentIds.filter(
        (id) => !parsed.data.selectedIds.includes(id),
      );
      if (addIds.length === 0 && removeIds.length === 0) return false;
      await applyRelationshipDelta(tx, {
        schoolId: session.user.schoolId,
        ...parsed.data,
        addIds,
        removeIds,
      });
      const discardedGenerationCount = await discardReadyScheduleGenerations(
        tx,
        session.user.schoolId,
      );
      await tx.auditLog.create({
        data: {
          schoolId: session.user.schoolId,
          actorId: session.user.id,
          action: "records.relationships.changed",
          entityType,
          entityId: parsed.data.entityId,
          metadata: {
            changedFields: [changedField],
            addedCount: addIds.length,
            removedCount: removeIds.length,
            discardedGenerationCount,
          },
        },
      });
      return true;
    });
    refreshRecords();
    return {
      status: "success",
      message: changed ? "Przypisania zostały zapisane." : "Przypisania są już aktualne.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Nie udało się zapisać przypisań.",
    };
  }
}

export async function updateStudentAvailabilityAction(
  _state: RecordUpdateState,
  formData: FormData,
): Promise<RecordUpdateState> {
  const session = await requireSchoolStaff("/panel/szkola/kartoteki");
  await requireEnabledModule(session, "records");
  const windows = [1, 2, 3, 4, 5, 6]
    .filter((weekday) => formData.get(`enabled-${weekday}`) === "on")
    .map((weekday) => ({
      weekday,
      startMinute: Number(formData.get(`start-${weekday}`)),
      endMinute: Number(formData.get(`end-${weekday}`)),
    }));
  const parsed = studentAvailabilityUpdateSchema.safeParse({
    studentId: formData.get("studentId"),
    windows,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Sprawdź godziny dostępności.",
    };
  }
  if (session.user.role === "TEACHER") {
    const allowed = await canTeacherEdit(
      session.user.id,
      session.user.schoolId,
      "USER",
      parsed.data.studentId,
    );
    if (!allowed) {
      return { status: "error", message: "Ten uczeń nie należy do Twojej grupy." };
    }
    const request = await db.recordChangeRequest.create({
      data: {
        schoolId: session.user.schoolId,
        requestedById: session.user.id,
        entityType: "USER",
        entityId: parsed.data.studentId,
        payload: {
          kind: "STUDENT_AVAILABILITY",
          windows: parsed.data.windows,
        } as Prisma.InputJsonValue,
        changedFields: ["preferowane godziny ucznia"],
      },
    });
    await db.auditLog.create({
      data: {
        schoolId: session.user.schoolId,
        actorId: session.user.id,
        action: "records.change.requested",
        entityType: "USER",
        entityId: parsed.data.studentId,
        metadata: { requestId: request.id, changedFields: ["preferowane godziny ucznia"] },
      },
    });
    refreshRecords();
    return { status: "success", message: "Preferencje wysłano do zatwierdzenia przez dyrektora." };
  }
  try {
    await db.$transaction(async (tx) => {
      await lockScheduleResources(tx, session.user.schoolId);
      await applyStudentAvailability(tx, {
        schoolId: session.user.schoolId,
        ...parsed.data,
      });
      const discardedGenerationCount = await discardReadyScheduleGenerations(
        tx,
        session.user.schoolId,
      );
      await tx.auditLog.create({
        data: {
          schoolId: session.user.schoolId,
          actorId: session.user.id,
          action: "records.student_availability.changed",
          entityType: "USER",
          entityId: parsed.data.studentId,
          metadata: {
            changedFields: ["preferowane godziny ucznia"],
            windowCount: parsed.data.windows.length,
            discardedGenerationCount,
          },
        },
      });
    });
    refreshRecords();
    return { status: "success", message: "Preferowane godziny ucznia zostały zapisane." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Nie udało się zapisać preferencji." };
  }
}
