"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireEnabledModule } from "@/modules/module-access/server";
import { redirect } from "next/navigation";

import { db } from "@/lib/server/db";
import { can } from "@/modules/access-control/can";
import { getFileStorage } from "@/modules/files/storage";
import { isPrivilegedIdentityRole } from "@/modules/identity/auth/access";
import {
  requireActiveSession,
  requireDirector,
} from "@/modules/identity/auth/session";

import {
  contractAcceptanceSchema,
  contractAssignmentSchema,
  contractPackageSchema,
  reuseContractPackageSchema,
  contractVersionSchema,
  signedContractSchema,
  type ContractActionState,
} from "./schema";
import {
  CONTRACT_ACCEPTANCE_STATEMENT_VERSION,
  CONTRACT_CONSUMER_NOTICE,
  CONTRACT_CONSUMER_NOTICE_VERSION,
  CONTRACT_LEGAL_CHECKLIST_VERSION,
  getContractAcceptanceStatement,
} from "./legal";
import { CONTRACT_ELIGIBLE_PERSON_STATUSES } from "./eligibility";

const contractsPath = "/panel/umowy";
const MAX_CONTRACT_BYTES = 10 * 1024 * 1024;

function amountToCents(value: string): number | null {
  if (!value) return null;
  return Math.round(Number(value.replace(",", ".")) * 100);
}

function isPdf(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
}

function buildInstallments(input: { count: number; installmentCents: number; totalCents: number; firstDueDate: string }) {
  const first = new Date(`${input.firstDueDate}T12:00:00Z`);
  return Array.from({ length: input.count }, (_, index) => {
    const targetMonth = first.getUTCMonth() + index;
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), targetMonth + 1, 0, 12)).getUTCDate();
    const dueDate = new Date(Date.UTC(first.getUTCFullYear(), targetMonth, Math.min(first.getUTCDate(), lastDay), 12));
    const regularSum = input.installmentCents * (input.count - 1);
    return {
      installmentNumber: index + 1,
      amountCents: index === input.count - 1 ? input.totalCents - regularSum : input.installmentCents,
      dueDate,
    };
  });
}

export async function createContractPackageAction(
  _previous: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const session = await requireDirector(contractsPath);
  await requireEnabledModule(session, "contracts");
  if (!isPrivilegedIdentityRole(session.user.role)) return { status: "error", message: "Tylko dyrektor lub właściciel systemu może wysłać pakiet." };
  const parsed = contractPackageSchema.safeParse({
    title: formData.get("title"), acceptanceMode: formData.get("acceptanceMode"),
    requiresPayment: formData.get("requiresPayment"), installmentCount: formData.get("installmentCount"),
    installmentAmount: formData.get("installmentAmount"), totalAmount: formData.get("totalAmount"),
    firstPaymentDueDate: formData.get("firstPaymentDueDate"), parentId: formData.get("parentId"),
    studentId: formData.get("studentId"), expiresAt: formData.get("expiresAt"), legalReadiness: formData.get("legalReadiness"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Sprawdź dane pakietu." };

  const documentInputs = [
    { field: "agreementDocument", kind: "AGREEMENT_RODO" as const, title: "Umowa i informacje RODO", position: 1 },
    { field: "priceListDocument", kind: "PRICE_LIST" as const, title: "Cennik / kosztorys", position: 2 },
    { field: "scheduleDocument", kind: "SCHEDULE" as const, title: "Harmonogram zajęć", position: 3 },
  ];
  const files: Array<(typeof documentInputs)[number] & { file: File; bytes: Uint8Array }> = [];
  for (const input of documentInputs) {
    const file = formData.get(input.field);
    if (!(file instanceof File) || file.size === 0) return { status: "error", message: `Dodaj plik: ${input.title}.` };
    if (file.size > MAX_CONTRACT_BYTES) return { status: "error", message: `${input.title}: maksymalnie 10 MB.` };
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (file.type !== "application/pdf" || !isPdf(bytes)) return { status: "error", message: `${input.title}: wybierz prawidłowy PDF.` };
    files.push({ ...input, file, bytes });
  }
  const relation = await db.parentChild.findFirst({
    where: { schoolId: session.user.schoolId, parentId: parsed.data.parentId, childId: parsed.data.studentId, archivedAt: null,
      parent: { role: "PARENT", status: { in: [...CONTRACT_ELIGIBLE_PERSON_STATUSES] }, archivedAt: null }, child: { role: "STUDENT", status: { in: [...CONTRACT_ELIGIBLE_PERSON_STATUSES] }, archivedAt: null } },
    select: { parentId: true },
  });
  if (!relation) return { status: "error", message: "Wybrany rodzic nie jest powiązany z tym uczniem." };

  const storage = getFileStorage();
  const uploaded: Array<Awaited<ReturnType<typeof storage.put>> & { file: File; kind: "AGREEMENT_RODO" | "PRICE_LIST" | "SCHEDULE"; title: string; position: number }> = [];
  try {
    for (const item of files) uploaded.push({ ...(await storage.put({ schoolId: session.user.schoolId, bytes: item.bytes })), file: item.file, kind: item.kind, title: item.title, position: item.position });
    const packageHash = createHash("sha256").update(uploaded.map((item) => `${item.kind}:${item.sha256}`).join("|")).digest("hex");
    const installmentAmountCents = amountToCents(parsed.data.installmentAmount)!;
    const totalAmountCents = amountToCents(parsed.data.totalAmount)!;
    const requiresPayment = parsed.data.requiresPayment === "yes";
    await db.$transaction(async (tx) => {
      const storedFiles = [];
      for (const item of uploaded) storedFiles.push({ item, record: await tx.storedFile.create({ data: {
        schoolId: session.user.schoolId, uploadedById: session.user.id, storageKey: item.storageKey,
        originalName: item.file.name.slice(0, 180), mimeType: "application/pdf", sizeBytes: item.sizeBytes, sha256: item.sha256, purpose: "CONTRACT",
      } }) });
      const agreement = storedFiles.find((entry) => entry.item.kind === "AGREEMENT_RODO")!;
      const contract = await tx.contract.create({ data: {
        schoolId: session.user.schoolId, title: parsed.data.title, acceptanceMode: parsed.data.acceptanceMode,
        serviceSummary: "Pakiet dokumentów: umowa i informacje RODO, cennik lub kosztorys oraz harmonogram zajęć.", requiresPayment,
        paymentSummary: requiresPayment ? `${parsed.data.installmentCount} rat; kwota całkowita ${(totalAmountCents / 100).toFixed(2)} PLN` : null,
      } });
      const version = await tx.contractVersion.create({ data: {
        contractId: contract.id, storedFileId: agreement.record.id, createdById: session.user.id, version: 1, sha256: packageHash,
        title: parsed.data.title, acceptanceMode: parsed.data.acceptanceMode,
        serviceSummary: "Szczegóły świadczenia, RODO i harmonogram znajdują się w załączonych plikach PDF.", requiresPayment,
        paymentSummary: requiresPayment ? `${parsed.data.installmentCount} rat po ${(installmentAmountCents / 100).toFixed(2)} PLN; łącznie ${(totalAmountCents / 100).toFixed(2)} PLN` : null,
        paymentAmountCents: requiresPayment ? installmentAmountCents : null, paymentLabel: requiresPayment ? `Rata 1 z ${parsed.data.installmentCount}` : null,
        paymentDueDate: requiresPayment ? new Date(`${parsed.data.firstPaymentDueDate}T12:00:00Z`) : null,
        cancellationSummary: "Szczegóły znajdują się w umowie PDF.", installmentCount: requiresPayment ? parsed.data.installmentCount : null,
        installmentAmountCents: requiresPayment ? installmentAmountCents : null, totalAmountCents: requiresPayment ? totalAmountCents : null,
      } });
      await tx.contractDocument.createMany({ data: storedFiles.map(({ item, record }) => ({ schoolId: session.user.schoolId, versionId: version.id, storedFileId: record.id, kind: item.kind, title: item.title, position: item.position })) });
      const assignment = await tx.contractAssignment.create({ data: {
        schoolId: session.user.schoolId, contractId: contract.id, versionId: version.id, parentId: parsed.data.parentId, studentId: parsed.data.studentId,
        expiresAt: parsed.data.expiresAt ? new Date(`${parsed.data.expiresAt}T23:59:59`) : null,
      } });
      if (requiresPayment) await tx.paymentInstallment.createMany({ data: buildInstallments({ count: parsed.data.installmentCount, installmentCents: installmentAmountCents, totalCents: totalAmountCents, firstDueDate: parsed.data.firstPaymentDueDate }).map((item) => ({ ...item, schoolId: session.user.schoolId, assignmentId: assignment.id, changedById: session.user.id })) });
      await tx.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "contracts.package.sent", entityType: "ContractAssignment", entityId: assignment.id,
        metadata: { packageHash, documentKinds: uploaded.map((item) => item.kind), installmentCount: requiresPayment ? parsed.data.installmentCount : 0, legalChecklistVersion: CONTRACT_LEGAL_CHECKLIST_VERSION } } });
    });
  } catch {
    await Promise.all(uploaded.map((item) => storage.remove(item.storageKey).catch(() => undefined)));
    return { status: "error", message: "Nie udało się zapisać pakietu. Spróbuj ponownie." };
  }
  revalidatePath(contractsPath); revalidatePath("/panel/platnosci"); revalidatePath("/panel/rodzic");
  return { status: "success", message: "Pakiet trzech dokumentów i harmonogram rat zostały wysłane rodzicowi." };
}

export async function reuseContractPackageAction(
  _previous: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const session = await requireDirector(contractsPath);
  await requireEnabledModule(session, "contracts");
  if (!isPrivilegedIdentityRole(session.user.role)) return { status: "error", message: "Tylko dyrektor lub właściciel systemu może wysłać pakiet." };
  const parsed = reuseContractPackageSchema.safeParse({ sourceVersionId: formData.get("sourceVersionId"), parentId: formData.get("parentId"), studentId: formData.get("studentId"), expiresAt: formData.get("expiresAt") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Sprawdź odbiorcę." };
  const [source, relation] = await Promise.all([
    db.contractVersion.findFirst({ where: { id: parsed.data.sourceVersionId, contract: { schoolId: session.user.schoolId, archivedAt: null }, documents: { some: {} } }, select: { id: true, contractId: true, requiresPayment: true, installmentCount: true, installmentAmountCents: true, totalAmountCents: true, paymentDueDate: true } }),
    db.parentChild.findFirst({ where: { schoolId: session.user.schoolId, parentId: parsed.data.parentId, childId: parsed.data.studentId, archivedAt: null }, select: { parentId: true } }),
  ]);
  if (!source) return { status: "error", message: "Wybrany pakiet nie jest już dostępny." };
  if (!relation) return { status: "error", message: "Wybrany rodzic nie jest powiązany z tym uczniem." };
  try {
    await db.$transaction(async (tx) => {
      const assignment = await tx.contractAssignment.create({ data: { schoolId: session.user.schoolId, contractId: source.contractId, versionId: source.id, parentId: parsed.data.parentId, studentId: parsed.data.studentId, expiresAt: parsed.data.expiresAt ? new Date(`${parsed.data.expiresAt}T23:59:59`) : null } });
      if (source.requiresPayment && source.installmentCount && source.installmentAmountCents && source.totalAmountCents && source.paymentDueDate) {
        const first = source.paymentDueDate.toISOString().slice(0, 10);
        await tx.paymentInstallment.createMany({ data: buildInstallments({ count: source.installmentCount, installmentCents: source.installmentAmountCents, totalCents: source.totalAmountCents, firstDueDate: first }).map((item) => ({ ...item, schoolId: session.user.schoolId, assignmentId: assignment.id, changedById: session.user.id })) });
      }
      await tx.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "contracts.package.reused", entityType: "ContractAssignment", entityId: assignment.id, metadata: { sourceVersionId: source.id } } });
    });
  } catch {
    return { status: "error", message: "Ten pakiet został już wysłany temu rodzicowi dla tego ucznia albo zapis się nie udał." };
  }
  revalidatePath(contractsPath); revalidatePath("/panel/platnosci"); revalidatePath("/panel/rodzic");
  return { status: "success", message: "Gotowy pakiet wysłano bez ponownego wpisywania danych." };
}

function signedFileMime(bytes: Uint8Array): "application/pdf" | "image/jpeg" | "image/png" | null {
  if (isPdf(bytes)) return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index])) return "image/png";
  return null;
}

export async function uploadSignedContractAction(
  _previous: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const session = await requireActiveSession(contractsPath);
  await requireEnabledModule(session, "contracts");
  const parsed = signedContractSchema.safeParse({ assignmentId: formData.get("assignmentId"), confirmation: formData.get("confirmation") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Sprawdź plik." };
  const assignment = await db.contractAssignment.findFirst({
    where: { id: parsed.data.assignmentId, schoolId: session.user.schoolId, parentId: session.user.id, status: "VIEWED", version: { acceptanceMode: "EXTERNAL_SIGNATURE" } },
    select: { id: true },
  });
  if (!assignment) return { status: "error", message: "Najpierw pobierz aktualny PDF albo sprawdź, czy plik nie został już wysłany." };
  const file = formData.get("signedDocument");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Wybierz podpisany PDF albo czytelne zdjęcie." };
  if (file.size > MAX_CONTRACT_BYTES) return { status: "error", message: "Podpisany dokument może mieć maksymalnie 10 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = signedFileMime(bytes);
  if (!mimeType) return { status: "error", message: "Dozwolony jest prawidłowy PDF, JPG albo PNG." };
  const storage = getFileStorage();
  let stored: Awaited<ReturnType<typeof storage.put>> | undefined;
  try {
    stored = await storage.put({ schoolId: session.user.schoolId, bytes });
    await db.$transaction(async (tx) => {
      const storedFile = await tx.storedFile.create({ data: { schoolId: session.user.schoolId, uploadedById: session.user.id, storageKey: stored!.storageKey, originalName: file.name.slice(0, 180), mimeType, sizeBytes: stored!.sizeBytes, sha256: stored!.sha256, purpose: "CONTRACT" } });
      const updated = await tx.contractAssignment.updateMany({ where: { id: assignment.id, status: "VIEWED", signedFileId: null }, data: { status: "SIGNED_PENDING_REVIEW", signedFileId: storedFile.id, signedUploadedAt: new Date() } });
      if (updated.count !== 1) throw new Error("STALE_ASSIGNMENT");
      await tx.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "contracts.signed_file.uploaded", entityType: "ContractAssignment", entityId: assignment.id, metadata: { fileHash: stored!.sha256, mimeType, sizeBytes: stored!.sizeBytes } } });
    });
  } catch {
    if (stored) await storage.remove(stored.storageKey).catch(() => undefined);
    return { status: "error", message: "Nie udało się zapisać podpisanego dokumentu. Spróbuj ponownie." };
  }
  revalidatePath(contractsPath);
  return { status: "success", message: "Dokument trafił do dyrektora. Otrzymasz informację po sprawdzeniu." };
}

export async function reviewSignedContractAction(formData: FormData): Promise<void> {
  const session = await requireDirector(contractsPath);
  await requireEnabledModule(session, "contracts");
  if (!isPrivilegedIdentityRole(session.user.role)) return;
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const assignment = await db.contractAssignment.findFirst({ where: { id: assignmentId, schoolId: session.user.schoolId, status: "SIGNED_PENDING_REVIEW" }, select: { id: true, signedFileId: true, signedFile: { select: { sha256: true } } } });
  if (!assignment?.signedFileId || !assignment.signedFile) return;
  const signedFileId = assignment.signedFileId;
  const signedFileHash = assignment.signedFile.sha256;
  await db.$transaction(async (tx) => {
    if (decision === "approve") {
      const updated = await tx.contractAssignment.updateMany({ where: { id: assignment.id, status: "SIGNED_PENDING_REVIEW" }, data: { status: "ACCEPTED" } });
      if (updated.count !== 1) throw new Error("STALE_ASSIGNMENT");
      await tx.contractAcceptance.create({ data: { assignmentId: assignment.id, acceptedById: session.user.id, documentHash: signedFileHash, evidence: { method: "handwritten-signed-copy-reviewed", signedFileHash, reviewedByRole: session.user.role } } });
    } else if (decision === "reject") {
      const updated = await tx.contractAssignment.updateMany({
        where: { id: assignment.id, status: "SIGNED_PENDING_REVIEW" },
        data: { status: "VIEWED", signedFileId: null, signedUploadedAt: null },
      });
      if (updated.count !== 1) throw new Error("STALE_ASSIGNMENT");
      await tx.storedFile.update({ where: { id: signedFileId }, data: { archivedAt: new Date() } });
    } else return;
    await tx.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: decision === "approve" ? "contracts.signed_file.approved" : "contracts.signed_file.rejected", entityType: "ContractAssignment", entityId: assignment.id, metadata: { signedFileHash } } });
  });
  revalidatePath(contractsPath);
  revalidatePath("/panel/rodzic");
  redirect(`${contractsPath}?umowa=${assignment.id}`);
}

export async function createContractAssignmentAction(
  _previous: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const session = await requireDirector(contractsPath);
  await requireEnabledModule(session, "contracts");
  if (!isPrivilegedIdentityRole(session.user.role)) {
    return { status: "error", message: "Tylko dyrektor lub właściciel systemu może wysłać umowę." };
  }
  const parsed = contractAssignmentSchema.safeParse({
    title: formData.get("title"),
    acceptanceMode: formData.get("acceptanceMode"),
    serviceSummary: formData.get("serviceSummary"),
    requiresPayment: formData.get("requiresPayment"),
    paymentSummary: formData.get("paymentSummary"),
    paymentAmount: formData.get("paymentAmount"),
    paymentLabel: formData.get("paymentLabel"),
    paymentDueDate: formData.get("paymentDueDate"),
    serviceStartDate: formData.get("serviceStartDate"),
    serviceEndDate: formData.get("serviceEndDate"),
    cancellationSummary: formData.get("cancellationSummary"),
    requiresEarlyStartRequest: formData.get("requiresEarlyStartRequest"),
    parentId: formData.get("parentId"),
    studentId: formData.get("studentId"),
    expiresAt: formData.get("expiresAt"),
    legalReadiness: formData.get("legalReadiness"),
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
      parent: { role: "PARENT", status: { in: [...CONTRACT_ELIGIBLE_PERSON_STATUSES] }, archivedAt: null },
      child: { role: "STUDENT", status: { in: [...CONTRACT_ELIGIBLE_PERSON_STATUSES] }, archivedAt: null },
    },
    select: { parentId: true },
  });
  if (!relation) {
    return {
      status: "error",
      message: "Wybrany rodzic nie jest powiązany z tym uczniem.",
    };
  }

  const storage = getFileStorage();
  let stored: Awaited<ReturnType<typeof storage.put>> | undefined;
  try {
    const uploaded = await storage.put({
      schoolId: session.user.schoolId,
      bytes,
    });
    stored = uploaded;
    await db.$transaction(async (tx) => {
      const storedFile = await tx.storedFile.create({
        data: {
          schoolId: session.user.schoolId,
          uploadedById: session.user.id,
          storageKey: uploaded.storageKey,
          originalName: file.name.slice(0, 180),
          mimeType: "application/pdf",
          sizeBytes: uploaded.sizeBytes,
          sha256: uploaded.sha256,
          purpose: "CONTRACT",
        },
      });
      const contract = await tx.contract.create({
        data: {
          schoolId: session.user.schoolId,
          title: parsed.data.title,
          acceptanceMode: parsed.data.acceptanceMode,
          serviceSummary: parsed.data.serviceSummary,
          requiresPayment: parsed.data.requiresPayment === "yes",
          paymentSummary:
            parsed.data.requiresPayment === "yes"
              ? parsed.data.paymentSummary
              : null,
        },
      });
      const version = await tx.contractVersion.create({
        data: {
          contractId: contract.id,
          storedFileId: storedFile.id,
          createdById: session.user.id,
          version: 1,
          sha256: uploaded.sha256,
          title: parsed.data.title,
          acceptanceMode: parsed.data.acceptanceMode,
          serviceSummary: parsed.data.serviceSummary,
          requiresPayment: parsed.data.requiresPayment === "yes",
          paymentSummary:
            parsed.data.requiresPayment === "yes"
              ? parsed.data.paymentSummary
              : null,
          paymentAmountCents:
            parsed.data.requiresPayment === "yes"
              ? amountToCents(parsed.data.paymentAmount)
              : null,
          paymentLabel:
            parsed.data.requiresPayment === "yes"
              ? parsed.data.paymentLabel
              : null,
          paymentDueDate:
            parsed.data.requiresPayment === "yes"
              ? new Date(`${parsed.data.paymentDueDate}T12:00:00`)
              : null,
          serviceStartDate: new Date(`${parsed.data.serviceStartDate}T12:00:00`),
          serviceEndDate: new Date(`${parsed.data.serviceEndDate}T12:00:00`),
          cancellationSummary: parsed.data.cancellationSummary,
          requiresEarlyStartRequest:
            parsed.data.requiresEarlyStartRequest === "yes",
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
          metadata: {
            version: 1,
            documentHash: uploaded.sha256,
            acceptanceMode: parsed.data.acceptanceMode,
            legalChecklistVersion: CONTRACT_LEGAL_CHECKLIST_VERSION,
          },
        },
      });
    });
  } catch {
    if (stored) await storage.remove(stored.storageKey).catch(() => undefined);
    return { status: "error", message: "Nie udało się zapisać umowy. Spróbuj ponownie." };
  }
  revalidatePath(contractsPath);
  revalidatePath("/panel/rodzic");
  return { status: "success", message: "Umowa została bezpiecznie wysłana rodzicowi." };
}

export async function createContractVersionAction(
  _previous: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const session = await requireDirector(contractsPath);
  await requireEnabledModule(session, "contracts");
  if (!isPrivilegedIdentityRole(session.user.role)) {
    return { status: "error", message: "Tylko dyrektor lub właściciel systemu może utworzyć nową wersję." };
  }
  const contractId = String(formData.get("contractId") ?? "");
  const sourceAssignmentId = String(formData.get("sourceAssignmentId") ?? "");
  const parsed = contractVersionSchema.safeParse({
    title: formData.get("title"),
    acceptanceMode: formData.get("acceptanceMode"),
    serviceSummary: formData.get("serviceSummary"),
    requiresPayment: formData.get("requiresPayment"),
    paymentSummary: formData.get("paymentSummary"),
    paymentAmount: formData.get("paymentAmount"),
    paymentLabel: formData.get("paymentLabel"),
    paymentDueDate: formData.get("paymentDueDate"),
    serviceStartDate: formData.get("serviceStartDate"),
    serviceEndDate: formData.get("serviceEndDate"),
    cancellationSummary: formData.get("cancellationSummary"),
    requiresEarlyStartRequest: formData.get("requiresEarlyStartRequest"),
    legalReadiness: formData.get("legalReadiness"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Sprawdź dane nowej wersji.",
    };
  }
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

  const storage = getFileStorage();
  let stored: Awaited<ReturnType<typeof storage.put>> | undefined;
  try {
    const uploaded = await storage.put({ schoolId: session.user.schoolId, bytes });
    stored = uploaded;
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
          storageKey: uploaded.storageKey,
          originalName: file.name.slice(0, 180),
          mimeType: "application/pdf",
          sizeBytes: uploaded.sizeBytes,
          sha256: uploaded.sha256,
          purpose: "CONTRACT",
        },
      });
      const version = await tx.contractVersion.create({
        data: {
          contractId,
          storedFileId: storedFile.id,
          createdById: session.user.id,
          version: latest.version + 1,
          sha256: uploaded.sha256,
          title: parsed.data.title,
          acceptanceMode: parsed.data.acceptanceMode,
          serviceSummary: parsed.data.serviceSummary,
          requiresPayment: parsed.data.requiresPayment === "yes",
          paymentSummary:
            parsed.data.requiresPayment === "yes"
              ? parsed.data.paymentSummary
              : null,
          paymentAmountCents:
            parsed.data.requiresPayment === "yes"
              ? amountToCents(parsed.data.paymentAmount)
              : null,
          paymentLabel:
            parsed.data.requiresPayment === "yes"
              ? parsed.data.paymentLabel
              : null,
          paymentDueDate:
            parsed.data.requiresPayment === "yes"
              ? new Date(`${parsed.data.paymentDueDate}T12:00:00`)
              : null,
          serviceStartDate: new Date(`${parsed.data.serviceStartDate}T12:00:00`),
          serviceEndDate: new Date(`${parsed.data.serviceEndDate}T12:00:00`),
          cancellationSummary: parsed.data.cancellationSummary,
          requiresEarlyStartRequest:
            parsed.data.requiresEarlyStartRequest === "yes",
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
          metadata: { version: version.version, documentHash: uploaded.sha256 },
        },
      });
    });
  } catch {
    if (stored) await storage.remove(stored.storageKey).catch(() => undefined);
    return { status: "error", message: "Nie udało się utworzyć nowej wersji. Spróbuj ponownie." };
  }
  revalidatePath(contractsPath);
  revalidatePath("/panel/rodzic");
  return { status: "success", message: "Nowa wersja została wysłana. Poprzednia pozostaje w historii." };
}

export async function acceptContractAction(
  _previous: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const session = await requireActiveSession(contractsPath);
  await requireEnabledModule(session, "contracts");
  const parsed = contractAcceptanceSchema.safeParse({
    assignmentId: formData.get("assignmentId"),
    documentConfirmation: formData.get("documentConfirmation"),
    consumerInformationConfirmation: formData.get("consumerInformationConfirmation"),
    paymentConfirmation: formData.get("paymentConfirmation") ?? undefined,
    earlyStartRequest: formData.get("earlyStartRequest") ?? undefined,
    earlyStartConsequences: formData.get("earlyStartConsequences") ?? undefined,
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
      version: {
        select: {
          sha256: true,
          version: true,
          title: true,
          acceptanceMode: true,
          serviceSummary: true,
          requiresPayment: true,
          paymentSummary: true,
          paymentAmountCents: true,
          paymentLabel: true,
          paymentDueDate: true,
          serviceStartDate: true,
          serviceEndDate: true,
          cancellationSummary: true,
          requiresEarlyStartRequest: true,
          installmentCount: true,
          installmentAmountCents: true,
          totalAmountCents: true,
          documents: {
            where: { requiredForAcceptance: true },
            select: { id: true, title: true, kind: true },
          },
        },
      },
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
  if (assignment.version.documents.length > 0) {
    const viewedRequiredDocuments = await db.contractDocumentView.count({
      where: {
        assignmentId: assignment.id,
        userId: session.user.id,
        documentId: { in: assignment.version.documents.map((document) => document.id) },
      },
    });
    if (viewedRequiredDocuments !== assignment.version.documents.length) {
      return {
        status: "error",
        message: "Najpierw otwórz wszystkie trzy dokumenty: umowę, kosztorys i harmonogram.",
      };
    }
  }
  if (assignment.version.acceptanceMode !== "DOCUMENTARY") {
    return {
      status: "error",
      message: "Ta umowa wymaga podpisu poza eDziennikiem.",
    };
  }
  if (
    assignment.version.requiresPayment &&
    parsed.data.paymentConfirmation !== "accepted"
  ) {
    return {
      status: "error",
      message: "Potwierdź, że rozumiesz obowiązek zapłaty.",
    };
  }
  if (
    assignment.version.requiresEarlyStartRequest &&
    (parsed.data.earlyStartRequest !== "accepted" ||
      parsed.data.earlyStartConsequences !== "accepted")
  ) {
    return {
      status: "error",
      message: "Potwierdź oba oświadczenia dotyczące wcześniejszego rozpoczęcia zajęć.",
    };
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
    const statementText = getContractAcceptanceStatement({
      title: assignment.version.title,
      version: assignment.version.version,
      serviceSummary: assignment.version.serviceSummary,
      requiresPayment: assignment.version.requiresPayment,
      paymentSummary: assignment.version.paymentSummary,
      paymentAmountCents: assignment.version.paymentAmountCents,
      paymentLabel: assignment.version.paymentLabel,
      paymentDueDate: assignment.version.paymentDueDate?.toLocaleDateString("pl-PL") ?? null,
      serviceStartDate: assignment.version.serviceStartDate?.toLocaleDateString("pl-PL") ?? null,
      serviceEndDate: assignment.version.serviceEndDate?.toLocaleDateString("pl-PL") ?? null,
      cancellationSummary: assignment.version.cancellationSummary,
      requiresEarlyStartRequest: assignment.version.requiresEarlyStartRequest,
      documentTitles: assignment.version.documents.map((document) => document.title),
      installmentCount: assignment.version.installmentCount,
      installmentAmountCents: assignment.version.installmentAmountCents,
      totalAmountCents: assignment.version.totalAmountCents,
    });
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
            statementVersion: CONTRACT_ACCEPTANCE_STATEMENT_VERSION,
            statementText,
            consumerNoticeVersion: CONTRACT_CONSUMER_NOTICE_VERSION,
            consumerNoticeText: CONTRACT_CONSUMER_NOTICE,
            confirmations: {
              documentRead: true,
              packageDocumentsRead: assignment.version.documents.map((document) => ({
                id: document.id,
                kind: document.kind,
                title: document.title,
              })),
              consumerInformationReceived: true,
              paymentObligationAcknowledged: assignment.version.requiresPayment,
              earlyStartRequested: assignment.version.requiresEarlyStartRequest,
              earlyStartConsequencesAcknowledged:
                assignment.version.requiresEarlyStartRequest,
            },
            actionLabel: assignment.version.requiresPayment
              ? "Zamówienie z obowiązkiem zapłaty"
              : "Akceptuję umowę",
            locale: "pl-PL",
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
