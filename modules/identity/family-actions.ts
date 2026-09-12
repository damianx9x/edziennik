"use server";

import { hashPassword } from "better-auth/crypto";
import { childLoginBase } from "./child-login";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { can } from "@/modules/access-control/can";
import { requirePanelAccess } from "./auth/session";
import { childPasswordSchema, childRequestSchema, childLoginDomain, createChildSchema } from "./family-schema";
import { lockScheduleResources } from "@/modules/schedule/resource-lock";

export type FamilyState = { status: "idle" | "success" | "error"; message?: string; login?: string };
const failure: FamilyState = { status: "error", message: "Nie udało się zapisać zmiany. Odśwież widok i spróbuj ponownie." };

export async function createChildAction(_: FamilyState, data: FormData): Promise<FamilyState> {
  const { user } = await requirePanelAccess("view:parent-dashboard", "/panel/rodzic/dzieci");
  if (user.role !== "PARENT") return failure;
  const parsed = createChildSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const input = parsed.data;
  const groupScope = { id: input.groupId, schoolId: user.schoolId, locationId: input.locationId, isActive: true, archivedAt: null, location: { schoolId: user.schoolId, isActive: true, archivedAt: null } };
  if (!await db.courseGroup.count({ where: groupScope })) return { status: "error", message: "Ta grupa nie jest już dostępna w wybranej lokalizacji. Wybierz inną grupę." };
  const password = await hashPassword(input.password);
  try {
    const login = await db.$transaction(async (tx) => {
      await lockScheduleResources(tx, user.schoolId);
      const parent = await tx.user.count({ where: { id: user.id, schoolId: user.schoolId, role: "PARENT", status: "ACTIVE", archivedAt: null } });
      if (!parent || !await tx.courseGroup.count({ where: groupScope })) return null;
      const children = await tx.parentChild.findMany({ where: { schoolId: user.schoolId, parentId: user.id, archivedAt: null }, select: { child: { select: { name: true } } } });
      if (children.length >= 10 || children.some(({ child }) => child.name.toLocaleLowerCase("pl") === input.name.toLocaleLowerCase("pl"))) return null;
      // Email/login is globally unique, so serialize allocation across schools too.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('kla-child-login', 0))`;
      const base = childLoginBase(input.name);
      let login = base;
      let suffix = 1;
      while (await tx.user.count({ where: { email: `${login}@${childLoginDomain}` } })) {
        login = `${base}${suffix++}`;
        if (suffix > 10000) throw new Error("Child login allocation limit");
      }
      const child = await tx.user.create({ data: {
        schoolId: user.schoolId, name: input.name, email: `${login}@${childLoginDomain}`,
        role: "STUDENT", status: "ACTIVE", emailVerified: true,
        studentProfile: { create: {} },
      } });
      await tx.account.create({ data: { userId: child.id, accountId: child.id, providerId: "credential", password } });
      await tx.parentChild.create({ data: { schoolId: user.schoolId, parentId: user.id, childId: child.id } });
      // The parent owns the new account; school approval grants access to a group's other resources.
      await tx.recordChangeRequest.create({ data: { schoolId: user.schoolId, requestedById: user.id, entityType: "USER", entityId: child.id,
        payload: { kind: "CHILD_GROUP", childId: child.id, name: input.name, locationId: input.locationId, groupId: input.groupId }, changedFields: ["groupId"] } });
      await tx.auditLog.create({ data: { schoolId: user.schoolId, actorId: user.id, action: "identity.child.created", entityType: "User", entityId: child.id } });
      return login;
    });
    if (!login) return { status: "error", message: "Sprawdź listę dzieci — dziecko o tym imieniu może już być dodane. Jeśli potrzebujesz pomocy, napisz do szkoły." };
    revalidatePath("/panel/rodzic");
    revalidatePath("/panel/rodzic/dzieci");
    revalidatePath("/panel/szkola/powiadomienia");
    return { status: "success", login, message: "Dziecko dodane! Może już się zalogować. Plan i materiały grupy pojawią się po potwierdzeniu przez szkołę." };
  } catch { return failure; }
}

export async function requestChildAction(_: FamilyState, data: FormData): Promise<FamilyState> {
  const { user } = await requirePanelAccess("view:parent-dashboard", "/panel/rodzic/dzieci");
  if (user.role !== "PARENT") return failure;
  const parsed = childRequestSchema.safeParse({ kind: "CHILD_ENROLLMENT", name: data.get("name") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  try {
    const created = await db.$transaction(async (tx) => {
      await lockScheduleResources(tx, user.schoolId);
      const activeParent = await tx.user.count({ where: { id: user.id, schoolId: user.schoolId, role: "PARENT", status: "ACTIVE", archivedAt: null } });
      if (!activeParent) return false;
      const pending = await tx.recordChangeRequest.findMany({ where: { schoolId: user.schoolId, requestedById: user.id, status: "PENDING" }, select: { payload: true } });
      if (pending.length >= 10 || pending.some((entry) => {
        const request = childRequestSchema.safeParse(entry.payload);
        return request.success && request.data.name.toLocaleLowerCase("pl") === parsed.data.name.toLocaleLowerCase("pl");
      })) return false;
      await tx.recordChangeRequest.create({ data: { schoolId: user.schoolId, requestedById: user.id, entityType: "USER", entityId: user.id, payload: parsed.data, changedFields: ["name"] } });
      await tx.auditLog.create({ data: { schoolId: user.schoolId, actorId: user.id, action: "identity.child.requested", entityType: "User", entityId: user.id } });
      return true;
    });
    if (!created) return { status: "error", message: "Sprawdź oczekujące zgłoszenia. Takie zgłoszenie może już istnieć lub osiągnięto limit 10 zgłoszeń." };
    revalidatePath("/panel/rodzic/dzieci");
    revalidatePath("/panel/szkola/powiadomienia");
    return { status: "success", message: "Zgłoszenie wysłane do szkoły. Po zatwierdzeniu ustawisz tutaj hasło dziecka." };
  } catch { return failure; }
}

export async function setChildPasswordAction(_: FamilyState, data: FormData): Promise<FamilyState> {
  const { user } = await requirePanelAccess("view:parent-dashboard", "/panel/rodzic/dzieci");
  if (user.role !== "PARENT") return failure;
  const parsed = childPasswordSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  // Reject unrelated targets before expensive password hashing; repeat under lock.
  const scope = { schoolId: user.schoolId, parentId: user.id, childId: parsed.data.childId, archivedAt: null, child: { schoolId: user.schoolId, role: "STUDENT", archivedAt: null } };
  if (!await db.parentChild.count({ where: scope })) return failure;
  const password = await hashPassword(parsed.data.password);
  try {
    const saved = await db.$transaction(async (tx) => {
      await lockScheduleResources(tx, user.schoolId);
      const parent = await tx.user.findFirst({ where: { id: user.id, schoolId: user.schoolId, role: "PARENT", status: "ACTIVE", archivedAt: null } });
      const link = await tx.parentChild.findFirst({ where: scope, include: { child: { include: { accounts: { where: { providerId: "credential" } } } } } });
      if (!parent || !link || !can(user, "manage:child-account", { schoolId: link.schoolId, parentIds: [link.parentId] })) return false;
      const child = link.child;
      const managed = child.email.endsWith(`@${childLoginDomain}`);
      if (child.banned || (child.status !== "ACTIVE" && !(managed && child.status === "INVITED" && child.accounts.length === 0))) return false;
      const recent = await tx.auditLog.count({ where: { schoolId: user.schoolId, actorId: user.id, action: "identity.child.password_set", createdAt: { gte: new Date(Date.now() - 3600_000) } } });
      if (recent >= 10) return false;
      if (child.accounts.length) {
        await tx.account.updateMany({ where: { userId: child.id, providerId: "credential" }, data: { password } });
      } else if (managed) {
        await tx.account.create({ data: { userId: child.id, accountId: child.id, providerId: "credential", password } });
      } else return false;
      await tx.user.update({ where: { id: child.id }, data: { status: "ACTIVE", passwordChangeRequired: false, temporaryPasswordExpiresAt: null } });
      await tx.session.deleteMany({ where: { userId: child.id } });
      await tx.auditLog.create({ data: { schoolId: user.schoolId, actorId: user.id, action: "identity.child.password_set", entityType: "User", entityId: child.id } });
      return true;
    });
    if (!saved) return { status: "error", message: "Nie można zmienić hasła: konto może być nieaktywne, powiązanie zmienione lub limit prób przekroczony. Skontaktuj się ze szkołą." };
    revalidatePath("/panel/rodzic/dzieci");
    return { status: "success", message: "Hasło zapisane. Przekaż je dziecku osobiście. Poprzednie sesje dziecka zostały wylogowane." };
  } catch { return failure; }
}
