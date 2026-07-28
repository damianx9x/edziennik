"use server";

import { createHash } from "node:crypto";
import path from "node:path";

import { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/server/db";
import { getFileStorage } from "@/modules/files/storage";
import { requireDirector } from "@/modules/identity/auth/session";
import { createRecordOnlyEmail } from "@/modules/people/record-email";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  parseImportFile,
  type ImportPreview,
  type ImportRow,
} from "./parser";
import type { ImportActionState } from "./state";
import { statusForImportedExistingUser } from "./user-status";

const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
const commitImportSchema = z.object({ batchId: z.uuid() });

export async function previewImportAction(
  _previousState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const session = await requireDirector();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return importError("Wybierz plik CSV albo XLSX.");
  }

  const originalName = path.basename(file.name).slice(0, 180);
  if (!/\.(csv|xlsx)$/i.test(originalName)) {
    return importError("Wybierz plik z rozszerzeniem .csv albo .xlsx.");
  }
  if (file.size === 0) {
    return importError("Wybrany plik jest pusty.");
  }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return importError("Plik może mieć maksymalnie 5 MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let preview: ImportPreview;
  try {
    preview = await parseImportFile({ fileName: originalName, bytes });
  } catch (error) {
    return importError(
      error instanceof Error
        ? error.message
        : "Nie udało się odczytać pliku. Pobierz szablon i spróbuj ponownie.",
    );
  }

  const stored = await getFileStorage().put({
    schoolId: session.user.schoolId,
    bytes,
  });
  const batch = await db.$transaction(async (transaction) => {
    const sourceFile = await transaction.storedFile.create({
      data: {
        schoolId: session.user.schoolId,
        uploadedById: session.user.id,
        storageKey: stored.storageKey,
        originalName,
        mimeType: getImportMimeType(originalName),
        sizeBytes: stored.sizeBytes,
        sha256: stored.sha256,
        purpose: "IMPORT_SOURCE",
      },
      select: { id: true },
    });
    return transaction.importBatch.create({
      data: {
        schoolId: session.user.schoolId,
        createdById: session.user.id,
        sourceFileId: sourceFile.id,
        totalRows: preview.totalRows,
        validRows: preview.validRows,
        errorRows: preview.errorRows,
        duplicateRows: preview.duplicateRows,
        errorSummary: summarizeIssues(preview),
      },
      select: { id: true },
    });
  });

  await db.auditLog.create({
    data: {
      schoolId: session.user.schoolId,
      actorId: session.user.id,
      action: "records.import.previewed",
      entityType: "ImportBatch",
      entityId: batch.id,
      metadata: {
        totalRows: preview.totalRows,
        validRows: preview.validRows,
        errorRows: preview.errorRows,
        duplicateRows: preview.duplicateRows,
      },
    },
  });

  return {
    status: "preview",
    message:
      preview.errorRows === 0
        ? "Plik jest gotowy. Sprawdź podgląd i zatwierdź import."
        : "Popraw wskazane wiersze w pliku i wczytaj go ponownie.",
    batchId: batch.id,
    preview,
  };
}

export async function commitImportAction(
  _previousState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const session = await requireDirector();
  const parsedInput = commitImportSchema.safeParse({
    batchId: formData.get("batchId"),
  });
  if (!parsedInput.success) {
    return importError("Podgląd importu wygasł. Wczytaj plik ponownie.");
  }

  const batch = await db.importBatch.findFirst({
    where: {
      id: parsedInput.data.batchId,
      schoolId: session.user.schoolId,
      createdById: session.user.id,
      status: "PREVIEW_READY",
      archivedAt: null,
    },
    include: { sourceFile: true },
  });
  if (!batch) {
    return importError(
      "Ten import został już wykonany albo nie jest dostępny dla tego konta.",
    );
  }
  if (batch.createdAt.getTime() < Date.now() - 24 * 60 * 60 * 1_000) {
    await db.importBatch.update({
      where: { id: batch.id },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    });
    return importError("Podgląd wygasł po 24 godzinach. Wczytaj plik ponownie.");
  }

  const bytes = await getFileStorage().read(batch.sourceFile.storageKey);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (
    digest !== batch.sourceFile.sha256 ||
    bytes.byteLength !== batch.sourceFile.sizeBytes
  ) {
    await db.importBatch.update({
      where: { id: batch.id },
      data: { status: "FAILED" },
    });
    return importError(
      "Plik nie przeszedł kontroli integralności. Wczytaj go ponownie.",
    );
  }

  const preview = await parseImportFile({
    fileName: batch.sourceFile.originalName,
    bytes,
  });
  if (preview.errorRows > 0) {
    return {
      status: "error",
      message: "Plik nadal zawiera błędy. Popraw go i wczytaj ponownie.",
      batchId: batch.id,
      preview,
    };
  }

  try {
    await db.$transaction(async (transaction) => {
      await applyImportRows(
        transaction,
        session.user.schoolId,
        session.user.id,
        preview.rows,
      );
      await transaction.importBatch.update({
        where: { id: batch.id },
        data: { status: "COMMITTED", committedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: {
          schoolId: session.user.schoolId,
          actorId: session.user.id,
          action: "records.import.committed",
          entityType: "ImportBatch",
          entityId: batch.id,
          metadata: {
            totalRows: preview.totalRows,
            entityCounts: countEntities(preview.rows),
          },
        },
      });
    });
  } catch {
    await db.importBatch.update({
      where: { id: batch.id },
      data: { status: "FAILED" },
    });
    return importError(
      "Import nie został zapisany. Żadne dane nie uległy zmianie. Sprawdź duplikaty i spróbuj ponownie.",
    );
  }

  revalidatePath("/panel/szkola");
  revalidatePath("/panel/szkola/kartoteki");
  return {
    status: "success",
    message: `Import zakończony. Zapisano ${preview.totalRows} wierszy.`,
  };
}

async function applyImportRows(
  transaction: Prisma.TransactionClient,
  schoolId: string,
  actorId: string,
  rows: ImportRow[],
) {
  const requestedLocationNames = [
    ...new Set(
      rows
        .filter((item) => item.entity === "ROOM" || item.entity === "GROUP")
        .map((item) => item.locationName?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  for (const name of requestedLocationNames) {
    await transaction.location.upsert({
      where: { schoolId_name: { schoolId, name } },
      update: { isActive: true, archivedAt: null },
      create: {
        schoolId,
        name,
        isOnline: normalizeLookup(name) === "online",
      },
    });
  }
  let fallbackLocation = await transaction.location.findFirst({
    where: { schoolId, isActive: true, archivedAt: null },
    orderBy: [{ isOnline: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  if (!fallbackLocation) {
    fallbackLocation = await transaction.location.create({
      data: { schoolId, name: "Główna lokalizacja" },
      select: { id: true, name: true },
    });
  }
  const activeLocations = await transaction.location.findMany({
    where: { schoolId, isActive: true, archivedAt: null },
    select: { id: true, name: true },
  });
  const locationByName = new Map(
    activeLocations.map((location) => [
      normalizeLookup(location.name),
      location.id,
    ]),
  );
  const locationIdFor = (row: ImportRow) =>
    (row.locationName
      ? locationByName.get(normalizeLookup(row.locationName))
      : undefined) ?? fallbackLocation.id;

  for (const row of rows.filter((item) => item.entity === "ROOM")) {
    await transaction.room.upsert({
      where: {
        schoolId_name: { schoolId, name: row.name! },
      },
      update: {
        capacity: row.capacity,
        locationId: locationIdFor(row),
        isActive: true,
        archivedAt: null,
      },
      create: {
        schoolId,
        locationId: locationIdFor(row),
        name: row.name!,
        capacity: row.capacity,
      },
    });
  }

  for (const row of rows.filter((item) => item.entity === "GROUP")) {
    await transaction.courseGroup.upsert({
      where: {
        schoolId_name: { schoolId, name: row.name! },
      },
      update: {
        cefrLevel: row.level ?? "MIXED",
        locationId: locationIdFor(row),
        isActive: true,
        archivedAt: null,
      },
      create: {
        schoolId,
        locationId: locationIdFor(row),
        name: row.name!,
        cefrLevel: row.level ?? "MIXED",
      },
    });
  }

  for (const row of rows.filter(
    (item) => item.entity === "TEACHER" || item.entity === "PARENT",
  )) {
    const role = row.entity === "TEACHER" ? "TEACHER" : "PARENT";
    const existing = await transaction.user.findUnique({
      where: { email: row.email! },
      select: { id: true, schoolId: true, role: true, status: true },
    });
    if (
      existing &&
      (existing.schoolId !== schoolId || existing.role !== role)
    ) {
      throw new Error("E-mail jest przypisany do innej kartoteki.");
    }
    const user = await transaction.user.upsert({
      where: { email: row.email! },
      update: {
        name: `${row.firstName} ${row.lastName}`,
        phone: row.phone,
        archivedAt: null,
        status: existing
          ? statusForImportedExistingUser(existing.status)
          : undefined,
      },
      create: {
        schoolId,
        email: row.email!,
        name: `${row.firstName} ${row.lastName}`,
        phone: row.phone,
        role,
        status: "INVITED",
      },
      select: { id: true },
    });
    if (role === "TEACHER") {
      await transaction.teacherProfile.upsert({
        where: { userId: user.id },
        update: { displayName: `${row.firstName} ${row.lastName}` },
        create: {
          userId: user.id,
          displayName: `${row.firstName} ${row.lastName}`,
        },
      });
    }
  }

  for (const row of rows.filter((item) => item.entity === "STUDENT")) {
    const existing = await transaction.user.findUnique({
      where: {
        schoolId_externalId: {
          schoolId,
          externalId: row.externalId!,
        },
      },
      select: { id: true, email: true, status: true },
    });
    const email =
      row.email ??
      existing?.email ??
      createRecordOnlyEmail(schoolId, row.externalId!);
    const user = existing
      ? await transaction.user.update({
          where: { id: existing.id },
          data: {
            email,
            name: `${row.firstName} ${row.lastName}`,
            phone: row.phone,
            archivedAt: null,
            status: statusForImportedExistingUser(existing.status),
          },
          select: { id: true },
        })
      : await transaction.user.create({
          data: {
            schoolId,
            email,
            name: `${row.firstName} ${row.lastName}`,
            phone: row.phone,
            externalId: row.externalId,
            role: "STUDENT",
            status: "INVITED",
          },
          select: { id: true },
        });
    await transaction.studentProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
  }

  const groups = await transaction.courseGroup.findMany({
    where: { schoolId, archivedAt: null },
    select: { id: true, name: true },
  });
  const groupByName = new Map(
    groups.map((group) => [normalizeLookup(group.name), group.id]),
  );
  const students = await transaction.user.findMany({
    where: {
      schoolId,
      role: "STUDENT",
      externalId: {
        in: rows
          .filter((row) => row.entity === "STUDENT")
          .map((row) => row.externalId!)
          .filter(Boolean),
      },
    },
    select: { id: true, externalId: true },
  });
  const studentByExternalId = new Map(
    students.map((student) => [student.externalId!, student.id]),
  );

  for (const row of rows.filter(
    (item) => item.entity === "STUDENT" && item.groupName,
  )) {
    const groupId = groupByName.get(normalizeLookup(row.groupName!));
    const studentId = studentByExternalId.get(row.externalId!);
    if (!groupId || !studentId) {
      throw new Error("Nie znaleziono grupy lub ucznia dla przypisania.");
    }
    await transaction.enrollment.upsert({
      where: { groupId_studentId: { groupId, studentId } },
      update: { status: "ACTIVE", endedAt: null },
      create: { groupId, studentId },
    });
    await transaction.auditLog.createMany({
      data: [
        {
          schoolId,
          actorId,
          action: "records.group.assigned",
          entityType: "User",
          entityId: studentId,
          metadata: { groupId, changedFields: ["groupAssignment"] },
        },
        {
          schoolId,
          actorId,
          action: "records.student.assigned",
          entityType: "CourseGroup",
          entityId: groupId,
          metadata: { studentId, changedFields: ["studentAssignment"] },
        },
      ],
    });
  }

  for (const row of rows.filter((item) => item.entity === "RELATION")) {
    const [parent, child] = await Promise.all([
      transaction.user.findFirst({
        where: {
          schoolId,
          role: "PARENT",
          email: row.parentEmail,
          archivedAt: null,
        },
        select: { id: true },
      }),
      transaction.user.findFirst({
        where: {
          schoolId,
          role: "STUDENT",
          externalId: row.childExternalId,
          archivedAt: null,
        },
        select: { id: true },
      }),
    ]);
    if (!parent || !child) {
      throw new Error("Nie znaleziono rodzica lub ucznia dla relacji.");
    }
    await transaction.parentChild.upsert({
      where: {
        parentId_childId: {
          parentId: parent.id,
          childId: child.id,
        },
      },
      update: { schoolId, archivedAt: null },
      create: {
        schoolId,
        parentId: parent.id,
        childId: child.id,
      },
    });
    await transaction.auditLog.createMany({
      data: [
        {
          schoolId,
          actorId,
          action: "records.parent.linked",
          entityType: "User",
          entityId: parent.id,
          metadata: { changedFields: ["childLink"] },
        },
        {
          schoolId,
          actorId,
          action: "records.parent.linked",
          entityType: "User",
          entityId: child.id,
          metadata: { changedFields: ["parentLink"] },
        },
      ],
    });
  }
}

function summarizeIssues(preview: ImportPreview): Prisma.InputJsonValue {
  const counts: Record<string, number> = {};
  preview.issues.forEach((issue) => {
    counts[issue.code] = (counts[issue.code] ?? 0) + 1;
  });
  return counts;
}

function countEntities(rows: ImportRow[]): Prisma.InputJsonValue {
  const counts: Record<string, number> = {};
  rows.forEach((row) => {
    counts[row.entity] = (counts[row.entity] ?? 0) + 1;
  });
  return counts;
}

function normalizeLookup(value: string): string {
  return value.trim().toLocaleLowerCase("pl-PL");
}

function getImportMimeType(fileName: string): string {
  return fileName.toLocaleLowerCase("pl-PL").endsWith(".csv")
    ? "text/csv"
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

function importError(message: string): ImportActionState {
  return { status: "error", message };
}
