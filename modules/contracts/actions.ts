"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/server/db";
import { can } from "@/modules/access-control/can";
import { getFileStorage } from "@/modules/files/storage";
import {
  requireActiveSession,
  requireDirector,
} from "@/modules/identity/auth/session";

import {
  contractAcceptanceSchema,
  contractAssignmentSchema,
  type ContractActionState,
} from "./schema";

const contractsPath = "/panel/umowy";
const MAX_CONTRACT_BYTES = 10 * 1024 * 1024;

function isPdf(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
}

export async function createContractAssignmentAction(
  _previous: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const session = await requireDirector(contractsPath);
  const parsed = contractAssignmentSchema.safeParse({
    title: formData.get("title"),
    parentId: formData.get("parentId"),
    studentId: formData.get("studentId"),
    expiresAt: formData.get("expiresAt"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Sprawdź dane umowy.",
    };
  }

  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Wybierz dokument PDF." };
  }
  if (file.size > MAX_CONTRACT_BYTES) {
    return { status: "error", message: "Dokument może mieć maksymalnie 10 MB." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type !== "application/pdf" || !isPdf(bytes)) {
    return { status: "error", message: "Do umowy można dodać tylko prawidłowy plik PDF." };
  }

  const relation = await db.parentChild.findFirst({
    where: {
      schoolId: session.user.schoolId,
      parentId: parsed.data.parentId,
      childId: parsed.data.studentId,
      archivedAt: null,
      parent: { role: "PARENT", status: "ACTIVE", archivedAt: null },
      child: { role: "STUDENT", status: "ACTIVE", archivedAt: null },
    },
    select: { parentId: true },
  });
  if (!relation) {
    return {
      status: "error",
      message: "Wybrany rodzic nie jest powiązany z tym uczniem.",
    };
  }

  try {
    const stored = await getFileStorage().put({
      schoolId: session.user.schoolId,
      bytes,
    });
    await db.$transaction(async (tx) => {
      const storedFile = await tx.storedFile.create({
        data: {
          schoolId: session.user.schoolId,
          uploadedById: session.user.id,
          storageKey: stored.storageKey,
          originalName: file.name.slice(0, 180),
          mimeType: "application/pdf",
          sizeBytes: stored.sizeBytes,
          sha256: stored.sha256,
          purpose: "CONTRACT",
        },
      });
      const contract = await tx.contract.create({
        data: { schoolId: session.user.schoolId, title: parsed.data.title },
      });
      const version = await tx.contractVersion.create({
        data: {
          contractId: contract.id,
          storedFileId: storedFile.id,
          createdById: session.user.id,
          version: 1,
          sha256: stored.sha256,
        },
      });
      const assignment = await tx.contractAssignment.create({
        data: {
          schoolId: session.user.schoolId,
          contractId: contract.id,
          versionId: version.id,
          parentId: parsed.data.parentId,
          studentId: parsed.data.studentId,
          expiresAt: parsed.data.expiresAt
            ? new Date(`${parsed.data.expiresAt}T23:59:59`)
            : null,
        },
      });
      await tx.auditLog.create({
        data: {
          schoolId: session.user.schoolId,
          actorId: session.user.id,
          action: "contracts.assignment.sent",
          entityType: "ContractAssignment",
          entityId: assignment.id,
          metadata: { version: 1, documentHash: stored.sha256 },
        },
      });
    });
    revalidatePath(contractsPath);
    revalidatePath("/panel/rodzic");
    return { status: "success", message: "Umowa została bezpiecznie wysłana rodzicowi." };
  } catch {
    return { status: "error", message: "Nie udało się zapisać umowy. Spróbuj ponownie." };
  }
}

export async function createContractVersionAction(
  _previous: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const session = await requireDirector(contractsPath);
  const contractId = String(formData.get("contractId") ?? "");
  const sourceAssignmentId = String(formData.get("sourceAssignmentId") ?? "");
  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Wybierz poprawiony dokument PDF." };
  }
  if (file.size > MAX_CONTRACT_BYTES) {
    return { status: "error", message: "Dokument może mieć maksymalnie 10 MB." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type !== "application/pdf" || !isPdf(bytes)) {
    return { status: "error", message: "Do umowy można dodać tylko prawidłowy plik PDF." };
  }

  const source = await db.contractAssignment.findFirst({
    where: {
      id: sourceAssignmentId,
      contractId,
      schoolId: session.user.schoolId,
      contract: { archivedAt: null },
    },
    select: { parentId: true, studentId: true, expiresAt: true },
  });
  if (!source) return { status: "error", message: "Ta umowa nie jest już dostępna." };

  try {
    const stored = await getFileStorage().put({ schoolId: session.user.schoolId, bytes });
    await db.$transaction(async (tx) => {
      const latest = await tx.contractVersion.findFirst({
        where: { contractId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      if (!latest) throw new Error("MISSING_VERSION");
      const storedFile = await tx.storedFile.create({
        data: {
          schoolId: session.user.schoolId,
          uploadedById: session.user.id,
          storageKey: stored.storageKey,
          originalName: file.name.slice(0, 180),
          mimeType: "application/pdf",
          sizeBytes: stored.sizeBytes,
          sha256: stored.sha256,
          purpose: "CONTRACT",
        },
      });
      const version = await tx.contractVersion.create({
        data: {
          contractId,
          storedFileId: storedFile.id,
          createdById: session.user.id,
          version: latest.version + 1,
          sha256: stored.sha256,
        },
      });
      await tx.contractAssignment.updateMany({
        where: { id: sourceAssignmentId, status: { not: "ACCEPTED" } },
        data: { status: "EXPIRED" },
      });
      const assignment = await tx.contractAssignment.create({
        data: {
          schoolId: session.user.schoolId,
          contractId,
          versionId: version.id,
          parentId: source.parentId,
          studentId: source.studentId,
          expiresAt: source.expiresAt,
        },
      });
      await tx.auditLog.create({
        data: {
          schoolId: session.user.schoolId,
          actorId: session.user.id,
          action: "contracts.version.created",
          entityType: "ContractAssignment",
          entityId: assignment.id,
          metadata: { version: version.version, documentHash: stored.sha256 },
        },
      });
    });
    revalidatePath(contractsPath);
    revalidatePath("/panel/rodzic");
    return { status: "success", message: "Nowa wersja została wysłana. Poprzednia pozostaje w historii." };
  } catch {
    return { status: "error", message: "Nie udało się utworzyć nowej wersji. Spróbuj ponownie." };
  }
}

export async function acceptContractAction(
  _previous: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const session = await requireActiveSession(contractsPath);
  const parsed = contractAcceptanceSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Nie udało się potwierdzić umowy.",
    };
  }

  const assignment = await db.contractAssignment.findFirst({
    where: {
      id: parsed.data.assignmentId,
      schoolId: session.user.schoolId,
    },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      parentId: true,
      version: { select: { sha256: true } },
    },
  });
  if (
    !assignment ||
    !can(
      { id: session.user.id, schoolId: session.user.schoolId, role: session.user.role },
      "accept:contract",
      { schoolId: session.user.schoolId, parentIds: [assignment?.parentId ?? ""] },
    )
  ) {
    return { status: "error", message: "Nie masz dostępu do tej umowy." };
  }
  if (assignment.status === "ACCEPTED") {
    return { status: "success", message: "Ta wersja umowy jest już zaakceptowana." };
  }
  if (assignment.status === "SENT") {
    return {
      status: "error",
      message: "Najpierw otwórz dokument PDF i zapoznaj się z jego treścią.",
    };
  }
  if (assignment.expiresAt && assignment.expiresAt < new Date()) {
    return { status: "error", message: "Termin akceptacji minął. Skontaktuj się ze szkołą." };
  }

  try {
    await db.$transaction(async (tx) => {
      const updated = await tx.contractAssignment.updateMany({
        where: { id: assignment.id, status: "VIEWED" },
        data: { status: "ACCEPTED", viewedAt: new Date() },
      });
      if (updated.count !== 1) throw new Error("STALE_ASSIGNMENT");
      await tx.contractAcceptance.create({
        data: {
          assignmentId: assignment.id,
          acceptedById: session.user.id,
          documentHash: assignment.version.sha256,
          evidence: {
            method: "authenticated-explicit-confirmation",
            statementVersion: "pilot-2026-v1",
          },
        },
      });
      await tx.auditLog.create({
        data: {
          schoolId: session.user.schoolId,
          actorId: session.user.id,
          action: "contracts.version.accepted",
          entityType: "ContractAssignment",
          entityId: assignment.id,
          metadata: { documentHash: assignment.version.sha256 },
        },
      });
    });
    revalidatePath(contractsPath);
    revalidatePath("/panel/rodzic");
    return { status: "success", message: "Akceptacja została zapisana razem z wersją dokumentu." };
  } catch {
    return { status: "error", message: "Nie udało się zapisać akceptacji. Odśwież stronę." };
  }
}
