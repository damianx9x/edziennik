import { CreditCard, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { db } from "@/lib/server/db";
import { requireActiveSession, requireDirector } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { PaymentList } from "@/modules/payments/components/payment-list";
import { getEffectivePaymentStatus } from "@/modules/payments/schema";
import { isPrivilegedIdentityRole } from "@/modules/identity/auth/access";

export const metadata: Metadata = { title: "Statusy płatności" };
export const dynamic = "force-dynamic";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ rodzic?: string; platnosc?: string }> }) {
  const session = await requireActiveSession("/panel/platnosci");
  if (!(isPrivilegedIdentityRole(session.user.role) || session.user.role === "PARENT")) redirect("/panel/brak-dostepu");
  const isManagement = isPrivilegedIdentityRole(session.user.role);
  if (isManagement) await requireDirector("/panel/platnosci");
  const params = await searchParams;
  const parentId = isManagement && params.rodzic ? params.rodzic : undefined;

  const assignments = await db.contractAssignment.findMany({
    where: {
      schoolId: session.user.schoolId,
      version: { requiresPayment: true },
      ...(isManagement
        ? parentId ? { parentId } : {}
        : { parentId: session.user.id, status: "ACCEPTED" }),
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      version: {
        select: {
          title: true,
          version: true,
          paymentAmountCents: true,
          paymentLabel: true,
          paymentDueDate: true,
          paymentSummary: true,
          installmentCount: true,
          totalAmountCents: true,
        },
      },
      parent: { select: { id: true, name: true } },
      student: { select: { name: true } },
      acceptance: { select: { acceptedAt: true } },
      paymentRecord: {
        include: { changedBy: { select: { name: true } } },
      },
      paymentInstallments: {
        orderBy: { installmentNumber: "asc" },
        include: { changedBy: { select: { name: true } } },
      },
    },
  });
  const now = new Date();

  return (
    <AuthenticatedPanelShell session={session} active="payments">
      <header className="stage4-heading">
        <div>
          <span className="section-kicker">Rozliczenia kursów</span>
          <h1>{isManagement ? "Płatności wynikające z umów" : "Płatności z zaakceptowanych umów"}</h1>
          <p>{isManagement ? "Kwota i termin pochodzą z wersji wysłanej rodzicowi. Ty zmieniasz tylko status rozliczenia." : "Widzisz kwotę, termin i aktualny status. Płatności nie wykonuje się w eDzienniku."}</p>
        </div>
        <span className="role-security-chip"><ShieldCheck aria-hidden="true" /> Bez danych bankowych</span>
      </header>
      <section className="stage4-list-section">
        <div className="stage4-section-title">
          <div><span className="section-kicker">Umowy odpłatne</span><h2>Lista rozliczeń</h2></div>
          <span>{assignments.length} {assignments.length === 1 ? "umowa" : "umów"}</span>
        </div>
        {parentId ? <a className="stage4-filter-reset" href="/panel/platnosci">Pokaż rozliczenia wszystkich rodziców</a> : null}
        {assignments.length === 0 ? (
          <div className="stage4-empty"><CreditCard aria-hidden="true" /><h3>Brak umów wymagających płatności</h3><p>{isManagement ? "Płatność pojawi się automatycznie po wysłaniu odpłatnej umowy." : "Jeśli masz pytanie, napisz do szkoły."}</p></div>
        ) : (
          <PaymentList
            isManagement={isManagement}
            initialSelectedId={params.platnosc}
            items={assignments.flatMap((assignment) => {
              const contractStatus =
                assignment.status !== "ACCEPTED" &&
                assignment.expiresAt &&
                assignment.expiresAt < now
                  ? "EXPIRED"
                  : assignment.status;
              const base = {
                assignmentId: assignment.id,
                parentId: assignment.parent.id,
                parentName: assignment.parent.name,
                studentName: assignment.student.name,
                contractTitle: assignment.version.title,
                contractVersion: assignment.version.version,
                installmentCount: assignment.version.installmentCount,
                totalAmountCents: assignment.version.totalAmountCents,
                contractStatus,
                acceptedAt: assignment.acceptance?.acceptedAt.toISOString() ?? null,
                paymentLabel: assignment.version.paymentLabel ?? "Płatność z umowy",
                paymentAmountCents: assignment.version.paymentAmountCents,
                paymentSummary: assignment.version.paymentSummary,
                dueDate: assignment.version.paymentDueDate?.toISOString() ?? null,
                storedStatus: assignment.paymentRecord?.status ?? null,
                displayStatus: getEffectivePaymentStatus({
                  contractStatus,
                  storedStatus: assignment.paymentRecord?.status ?? null,
                  dueDate: assignment.version.paymentDueDate,
                  now,
                }),
                updatedAt: assignment.paymentRecord?.updatedAt.toISOString() ?? null,
                changedByName: isManagement ? assignment.paymentRecord?.changedBy.name ?? null : null,
                note: isManagement ? assignment.paymentRecord?.note ?? null : null,
              };
              if (assignment.paymentInstallments.length === 0) return [{ ...base, itemId: assignment.id, installmentId: "", installmentNumber: 0 }];
              return assignment.paymentInstallments.map((installment) => ({
                ...base,
                itemId: installment.id,
                installmentId: installment.id,
                installmentNumber: installment.installmentNumber,
                paymentLabel: `Rata ${installment.installmentNumber} z ${assignment.version.installmentCount ?? assignment.paymentInstallments.length}`,
                paymentAmountCents: installment.amountCents,
                dueDate: installment.dueDate.toISOString(),
                storedStatus: installment.status,
                displayStatus: getEffectivePaymentStatus({ contractStatus, storedStatus: installment.status, dueDate: installment.dueDate, now }),
                updatedAt: installment.updatedAt.toISOString(),
                changedByName: isManagement ? installment.changedBy.name : null,
                note: isManagement ? installment.note : null,
              }));
            })}
          />
        )}
      </section>
    </AuthenticatedPanelShell>
  );
}
