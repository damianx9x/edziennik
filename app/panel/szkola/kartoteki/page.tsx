import {
  Archive,
  DoorOpen,
  FileSpreadsheet,
  GraduationCap,
  Plus,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/server/db";
import { archiveRecordAction } from "@/modules/groups/actions";
import { cefrLabels } from "@/modules/groups/schema";
import { requireDirector } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import {
  PersonDirectory,
  type PersonDirectoryRecord,
} from "@/modules/people/components/person-directory";
import { QuickRecordForms } from "@/modules/people/components/quick-record-forms";

export const metadata: Metadata = { title: "Kartoteki szkoły" };
export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  const session = await requireDirector("/panel/szkola/kartoteki");
  const schoolId = session.user.schoolId;
  const [rooms, groups, people] = await Promise.all([
    db.room.findMany({
      where: { schoolId, archivedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        capacity: true,
        _count: { select: { scheduleSlots: true } },
      },
    }),
    db.courseGroup.findMany({
      where: { schoolId, archivedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        cefrLevel: true,
        _count: {
          select: {
            enrollments: { where: { status: "ACTIVE" } },
            teachers: { where: { archivedAt: null } },
          },
        },
      },
    }),
    db.user.findMany({
      where: {
        schoolId,
        role: { in: ["TEACHER", "PARENT", "STUDENT"] },
        archivedAt: null,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      take: 300,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        externalId: true,
        role: true,
        status: true,
        accounts: { select: { id: true }, take: 1 },
        groupTeaching: {
          where: { archivedAt: null },
          select: { group: { select: { name: true } } },
        },
        parentLinks: {
          where: { archivedAt: null },
          select: { child: { select: { name: true } } },
        },
        enrollments: {
          where: { status: "ACTIVE" },
          select: { group: { select: { name: true } } },
        },
      },
    }),
  ]);

  const directoryPeople: PersonDirectoryRecord[] = people.map((person) => {
    const role = person.role as PersonDirectoryRecord["role"];
    const relations =
      role === "TEACHER"
        ? person.groupTeaching.map((item) => item.group.name)
        : role === "PARENT"
          ? person.parentLinks.map((item) => item.child.name)
          : person.enrollments.map((item) => item.group.name);
    const recordOnlyEmail =
      person.email.startsWith("record.") &&
      person.email.endsWith("@invalid.example");

    return {
      id: person.id,
      name: person.name,
      email: recordOnlyEmail ? null : person.email,
      phone: person.phone,
      externalId: person.externalId,
      role,
      status: person.status,
      hasAccount: person.accounts.length > 0,
      relationLabel: formatRelationCount(role, relations.length),
      relations,
    };
  });
  const personCounts = directoryPeople.reduce(
    (counts, person) => {
      if (person.role === "TEACHER") counts.teachers += 1;
      if (person.role === "PARENT") counts.parents += 1;
      if (person.role === "STUDENT") counts.students += 1;
      return counts;
    },
    { teachers: 0, parents: 0, students: 0 },
  );

  return (
    <AuthenticatedPanelShell session={session} active="records">
      <header className="role-panel-heading records-page-heading">
        <div>
          <span className="section-kicker">Dane szkoły</span>
          <h1>Kartoteki</h1>
          <p>
            Znajdź osobę i otwórz jej kartę. Grupy i sale są niżej, gotowe do
            użycia w grafiku.
          </p>
        </div>
        <div className="records-heading-actions">
          <Link className="button button-secondary" href="/panel/szkola/importy">
            <FileSpreadsheet aria-hidden="true" /> Import i eksport
          </Link>
          <a className="button button-primary" href="#dodaj">
            <Plus aria-hidden="true" /> Dodaj
          </a>
        </div>
      </header>

      <section className="records-summary-strip" aria-label="Stan kartotek">
        <a href="#osoby">
          <Users aria-hidden="true" />
          <span>
            <strong>{personCounts.students}</strong>
            Uczniowie
          </span>
        </a>
        <a href="#osoby">
          <UserRoundCheck aria-hidden="true" />
          <span>
            <strong>{personCounts.teachers}</strong>
            Wykładowcy
          </span>
        </a>
        <a href="#grupy">
          <GraduationCap aria-hidden="true" />
          <span>
            <strong>{groups.length}</strong>
            Grupy
          </span>
        </a>
        <a href="#sale">
          <DoorOpen aria-hidden="true" />
          <span>
            <strong>{rooms.length}</strong>
            Sale
          </span>
        </a>
      </section>

      <section className="records-safety-banner records-safety-compact">
        <ShieldCheck aria-hidden="true" />
        <span>
          <strong>Zmiany pozostawiają historię</strong>
          <small>Archiwizacja ukrywa rekord bez niszczenia jego powiązań.</small>
        </span>
      </section>

      <QuickRecordForms />

      <div id="osoby">
        <PersonDirectory people={directoryPeople} />
      </div>

      <section className="resource-directory" aria-labelledby="resources-title">
        <div className="records-section-heading">
          <div>
            <span className="section-kicker">Zasoby do grafiku</span>
            <h2 id="resources-title">Grupy i sale</h2>
            <p>Krótka lista bez mieszania jej z kartotekami osób.</p>
          </div>
        </div>

        <div className="resource-directory-grid">
          <article className="records-card resource-list-card" id="grupy">
            <ResourceHeading
              icon={<GraduationCap aria-hidden="true" />}
              title="Grupy"
              count={groups.length}
            />
            {groups.length === 0 ? (
              <RecordsEmpty
                title="Nie ma jeszcze grup"
                text="Dodaj pierwszą grupę przyciskiem u góry."
              />
            ) : (
              <ul>
                {groups.map((group) => (
                  <li key={group.id}>
                    <span>
                      <strong>{group.name}</strong>
                      <small>
                        {cefrLabels[group.cefrLevel]} ·{" "}
                        {formatSimpleCount(
                          group._count.enrollments,
                          "uczeń",
                          "uczniów",
                        )}{" "}
                        ·{" "}
                        {formatSimpleCount(
                          group._count.teachers,
                          "wykładowca",
                          "wykładowców",
                        )}
                      </small>
                    </span>
                    <ArchiveControl
                      id={group.id}
                      type="group"
                      label={`grupę ${group.name}`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="records-card resource-list-card" id="sale">
            <ResourceHeading
              icon={<DoorOpen aria-hidden="true" />}
              title="Sale"
              count={rooms.length}
            />
            {rooms.length === 0 ? (
              <RecordsEmpty
                title="Nie ma jeszcze sal"
                text="Dodaj pierwszą salę przyciskiem u góry."
              />
            ) : (
              <ul>
                {rooms.map((room) => (
                  <li key={room.id}>
                    <span>
                      <strong>{room.name}</strong>
                      <small>
                        {room.capacity
                          ? formatSimpleCount(
                              room.capacity,
                              "miejsce",
                              "miejsc",
                            )
                          : "Nie podano liczby miejsc"}{" "}
                        ·{" "}
                        {formatSimpleCount(
                          room._count.scheduleSlots,
                          "zajęcie",
                          "zajęć",
                        )}
                      </small>
                    </span>
                    <ArchiveControl
                      id={room.id}
                      type="room"
                      label={`salę ${room.name}`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>
    </AuthenticatedPanelShell>
  );
}

function formatRelationCount(
  role: PersonDirectoryRecord["role"],
  count: number,
) {
  if (role === "PARENT") {
    return formatSimpleCount(count, "dziecko", "dzieci");
  }
  return `${count} ${polishGroupNoun(count)}`;
}

function formatSimpleCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function polishGroupNoun(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (count === 1) return "grupa";
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) {
    return "grupy";
  }
  return "grup";
}

function ResourceHeading({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="records-card-heading">
      <span className="record-icon record-icon-blue">{icon}</span>
      <div>
        <h2>{title}</h2>
      </div>
      <span className="records-count">{count}</span>
    </div>
  );
}

function RecordsEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="records-empty">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function ArchiveControl({
  id,
  type,
  label,
}: {
  id: string;
  type: "room" | "group";
  label: string;
}) {
  return (
    <details className="archive-control">
      <summary>
        <Archive aria-hidden="true" /> Archiwizuj
      </summary>
      <div>
        <p>Ukryć {label}? Historia pozostanie w systemie.</p>
        <form action={archiveRecordAction}>
          <input type="hidden" name="recordId" value={id} />
          <input type="hidden" name="recordType" value={type} />
          <button type="submit">Tak, przenieś do archiwum</button>
        </form>
      </div>
    </details>
  );
}
