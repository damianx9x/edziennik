"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireDirector } from "@/modules/identity/auth/session";
import { requireEnabledModule } from "@/modules/module-access/server";
import { lockScheduleResources, discardReadyScheduleGenerations } from "@/modules/schedule/resource-lock";
import { childLoginDomain } from "@/modules/identity/family-schema";

export type ChangeRoleState = { status: "idle" | "success" | "error"; message?: string };
const schema = z.object({ id: z.uuid(), role: z.enum(["PARENT", "STUDENT", "TEACHER"]), confirmation: z.literal("yes") });

export async function changePersonRoleAction(_: ChangeRoleState, data: FormData): Promise<ChangeRoleState> {
  const session = await requireDirector("/panel/szkola/kartoteki");
  await requireEnabledModule(session, "records");
  const input = schema.safeParse(Object.fromEntries(data));
  if (!input.success) return { status: "error", message: "Wybierz nową rolę i potwierdź zmianę dostępu." };
  const { id, role } = input.data;
  try {
    const error = await db.$transaction(async (tx) => {
      const schoolId = session.user.schoolId;
      await lockScheduleResources(tx, schoolId);
      const person = await tx.user.findFirst({ where: { id, schoolId, role: { in: ["TEACHER", "PARENT", "STUDENT"] }, archivedAt: null } });
      if (!person || id === session.user.id) return "Nie można zmienić roli tego konta.";
      if (person.role === role) return "Ta osoba ma już wybraną rolę.";
      if (role !== "STUDENT" && person.email.endsWith(`@${childLoginDomain}`)) return "To konto dziecka bez e-maila. Najpierw wpisz w kartotece prawdziwy adres e-mail dorosłej osoby.";
      if (person.role === "TEACHER" && await tx.scheduleSlot.count({ where: { schoolId, teacherId: id, status: { not: "CANCELLED" }, endAt: { gt: new Date() }, archivedAt: null } })) return "Wykładowca ma przyszłe lekcje. Najpierw przypisz do nich innego wykładowcę.";
      const now = new Date();
      if (person.role === "TEACHER") {
        await tx.groupTeacher.updateMany({ where: { teacherId: id, group: { schoolId }, archivedAt: null }, data: { archivedAt: now } });
        await tx.schedulingRequirement.updateMany({ where: { schoolId, teacherId: id }, data: { teacherId: null } });
      }
      if (person.role === "STUDENT") {
        await tx.enrollment.updateMany({ where: { studentId: id, group: { schoolId }, status: "ACTIVE" }, data: { status: "CANCELLED", endedAt: now } });
        await tx.parentChild.updateMany({ where: { schoolId, childId: id, archivedAt: null }, data: { archivedAt: now } });
      }
      if (person.role === "PARENT") await tx.parentChild.updateMany({ where: { schoolId, parentId: id, archivedAt: null }, data: { archivedAt: now } });
      if (role === "TEACHER") await tx.teacherProfile.upsert({ where: { userId: id }, create: { userId: id }, update: {} });
      if (role === "STUDENT") await tx.studentProfile.upsert({ where: { userId: id }, create: { userId: id }, update: {} });
      await tx.recordChangeRequest.updateMany({
        where: { schoolId, status: "PENDING", OR: [{ requestedById: id }, { entityId: id }] },
        data: { status: "REJECTED", reviewedById: session.user.id, reviewedAt: now, reviewNote: "Rola konta została zmieniona. Zgłoszenie wymaga ponownego złożenia w nowej roli." },
      });
      await tx.user.update({ where: { id }, data: { role } });
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.invitation.updateMany({ where: { schoolId, email: person.email, revokedAt: null, acceptedAt: null }, data: { revokedAt: now } });
      await discardReadyScheduleGenerations(tx, schoolId);
      await tx.auditLog.create({ data: { schoolId, actorId: session.user.id, action: "identity.role.changed", entityType: "User", entityId: id, metadata: { fromRole: person.role, toRole: role } } });
      return null;
    });
    if (error) return { status: "error", message: error };
    revalidatePath("/panel/szkola/kartoteki"); revalidatePath("/panel/plan");
    return { status: "success", message: "Rola zmieniona. Poprzednie sesje wylogowano. Sprawdź przypisanie grup i dzieci w nowej roli." };
  } catch { return { status: "error", message: "Nie udało się zmienić roli. Dane pozostały bez zmian." }; }
}
