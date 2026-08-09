import { CreditCard, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { db } from "@/lib/server/db";
import { requireActiveSession, requireDirector } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { PaymentStatusForm } from "@/modules/payments/components/payment-status-form";
import { PaymentList } from "@/modules/payments/components/payment-list";

export const metadata: Metadata = { title: "Statusy płatności" };
export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await requireActiveSession("/panel/platnosci");
  if (!["DIRECTOR", "PARENT"].includes(session.user.role)) redirect("/panel/brak-dostepu");
  const isManagement = session.user.role === "DIRECTOR";
  if (isManagement) await requireDirector("/panel/platnosci");

  const childIds = isManagement
    ? undefined
    : (await db.parentChild.findMany({
        where: { schoolId: session.user.schoolId, parentId: session.user.id, archivedAt: null },
        select: { childId: true },
      })).map((link) => link.childId);
  const records = await db.paymentRecord.findMany({
    where: {
      schoolId: session.user.schoolId,
      ...(childIds ? { studentId: { in: childIds } } : {}),
    },
    orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    include: { student: { select: { name: true } }, changedBy: { select: { name: true } } },
  });
  const students = isManagement
    ? await db.user.findMany({
        where: { schoolId: session.user.schoolId, role: "STUDENT", status: "ACTIVE", archivedAt: null },
        orderBy: { name: "asc" }, select: { id: true, name: true },
      })
    : [];

  return (
    <AuthenticatedPanelShell session={session} active="payments">
      <header className="stage4-heading">
        <div>
          <span className="section-kicker">Etap 4 · płatności</span>
          <h1>{isManagement ? "Statusy rozliczeń bez księgowego żargonu" : "Statusy płatności dzieci"}</h1>
          <p>{isManagement ? "Oznaczaj ręcznie. Każda zmiana zostaje w historii audytu." : "To informacja od szkoły — płatności nie wykonuje się w eDzienniku."}</p>
        </div>
        <span className="role-security-chip"><ShieldCheck aria-hidden="true" /> Bez danych bankowych</span>
      </header>
      {isManagement ? <PaymentStatusForm students={students} /> : null}
      <section className="stage4-list-section">
        <div className="stage4-section-title">
          <div><span className="section-kicker">Przegląd</span><h2>Ostatnie statusy</h2></div>
          <span>{records.length} pozycji</span>
        </div>
        {records.length === 0 ? (
          <div className="stage4-empty"><CreditCard aria-hidden="true" /><h3>Brak zapisanych statusów</h3><p>{isManagement ? "Dodaj pierwszy status formularzem powyżej." : "Jeśli masz pytanie, napisz do szkoły."}</p></div>
        ) : (
          <PaymentList
            isManagement={isManagement}
            items={records.map((record) => ({
              id: record.id,
              studentName: record.student.name,
              period: record.period,
              status: record.status,
              dueDate: record.dueDate?.toISOString() ?? null,
              updatedAt: record.updatedAt.toISOString(),
              changedByName: isManagement ? record.changedBy.name : null,
              note: isManagement ? record.note : null,
            }))}
          />
        )}
      </section>
    </AuthenticatedPanelShell>
  );
}
