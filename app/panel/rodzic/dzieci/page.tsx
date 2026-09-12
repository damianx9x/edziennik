import Link from "next/link";
import { db } from "@/lib/server/db";
import { requirePanelAccess } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { ChildPasswordForm, ChildRequestForm } from "@/modules/identity/components/family-forms";
import { childLogin, childRequestSchema, childGroupRequestSchema } from "@/modules/identity/family-schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moje dzieci" };
export default async function FamilyPage() {
  const session = await requirePanelAccess("view:parent-dashboard", "/panel/rodzic/dzieci");
  const { user } = session;
  const [children, requests, locations] = await Promise.all([
    db.parentChild.findMany({
      where: { schoolId: user.schoolId, parentId: user.id, archivedAt: null,
        child: { schoolId: user.schoolId, role: "STUDENT", archivedAt: null } },
      select: { child: { select: {
        id: true, name: true, email: true, status: true,
        enrollments: {
          where: { status: "ACTIVE", group: { schoolId: user.schoolId, isActive: true, archivedAt: null } },
          select: { group: { select: { name: true, location: { select: { name: true } } } } },
        },
      } } },
      orderBy: { createdAt: "asc" },
    }),
    db.recordChangeRequest.findMany({ where: { schoolId: user.schoolId, requestedById: user.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.location.findMany({ where: { schoolId: user.schoolId, isActive: true, archivedAt: null }, orderBy: { name: "asc" },
      select: { id: true, name: true, address: true, isOnline: true, courseGroups: { where: { schoolId: user.schoolId, isActive: true, archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } } } }),
  ]);
  return <AuthenticatedPanelShell session={session}>
    <header className="role-panel-heading"><div><Link href="/panel/rodzic">Wróć do panelu</Link><h1>Moje dzieci</h1><p>Dodaj dziecko, wybierz grupę i pomóż mu zacząć. Wszystko załatwisz tutaj.</p></div></header>
    <section aria-label="Powiązane dzieci" className="family-list">
      {!children.length && <p>Dodaj pierwsze dziecko poniżej. Jeśli dziecko ma już konto w szkole, poproś szkołę o połączenie kont.</p>}
      {children.map(({ child }) => <article key={child.id} className="family-card"><h2>{child.name}</h2><p>{child.status === "ACTIVE" ? "Konto aktywne" : child.status === "INVITED" ? "Oczekuje na uruchomienie dostępu" : "Konto nieaktywne — skontaktuj się ze szkołą"}</p><p>{child.enrollments.length ? child.enrollments.map(({ group }) => `${group.name} · ${group.location.name}`).join(" / ") : "Grupa pojawi się po potwierdzeniu przez szkołę."}</p><ChildPasswordForm childId={child.id} name={child.name} login={childLogin(child.email)} /></article>)}
    </section>
    {user.role === "PARENT" && <section className="family-card family-add-card"><ChildRequestForm locations={locations.map(({ courseGroups, ...location }) => ({ ...location, groups: courseGroups }))} /></section>}
    <section className="family-card"><h2>Potwierdzenia ze szkoły</h2><ul>{requests.flatMap((request) => {
      const payload = childGroupRequestSchema.safeParse(request.payload).success ? childGroupRequestSchema.safeParse(request.payload) : childRequestSchema.safeParse(request.payload);
      return payload.success ? [<li key={request.id}>{payload.data.name} — {request.status === "PENDING" ? "czeka na szkołę" : request.status === "APPROVED" ? "zatwierdzone" : "odrzucone — skontaktuj się ze szkołą"}</li>] : [];
    })}</ul></section>
  </AuthenticatedPanelShell>;
}
