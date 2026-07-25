import {
  Archive,
  Database,
  DoorOpen,
  Download,
  GraduationCap,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";

import { db } from "@/lib/server/db";
import { archiveRecordAction } from "@/modules/groups/actions";
import { cefrLabels } from "@/modules/groups/schema";
import { requireDirector } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { maskEmail } from "@/modules/identity/invitations/token";
import { ImportWizard } from "@/modules/imports/components/import-wizard";
import { QuickRecordForms } from "@/modules/people/components/quick-record-forms";
import { recordRoleLabels } from "@/modules/people/schema";

export const metadata: Metadata = { title: "Kartoteki i import" };
export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  const session = await requireDirector("/panel/szkola/kartoteki");
  const schoolId = session.user.schoolId;
  const [rooms, groups, people, recentImports] = await Promise.all([
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
      take: 200,
      select: {
        id: true,
        name: true,
        email: true,
        externalId: true,
        role: true,
        accounts: { select: { id: true }, take: 1 },
        _count: {
          select: {
            groupTeaching: { where: { archivedAt: null } },
            parentLinks: { where: { archivedAt: null } },
            enrollments: { where: { status: "ACTIVE" } },
          },
        },
      },
    }),
    db.importBatch.findMany({
      where: { schoolId, archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        status: true,
        totalRows: true,
        errorRows: true,
        duplicateRows: true,
        createdAt: true,
        sourceFile: { select: { originalName: true } },
      },
    }),
  ]);

  const personCounts = people.reduce(
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
          <span className="section-kicker">Etap 2 · dane szkoły</span>
          <h1>Kartoteki i import</h1>
          <p>
            Sale, grupy i osoby w jednym miejscu. Większą listę wczytasz z
            arkusza, a system pokaże błędy przed zapisem.
          </p>
        </div>
        <a className="button button-primary" href="/szablon-importu-kla.csv">
          <Download aria-hidden="true" /> Pobierz szablon
        </a>
      </header>

      <section className="records-safety-banner">
        <ShieldCheck aria-hidden="true" />
        <span>
          <strong>Nic nie jest kasowane bezpowrotnie</strong>
          <small>
            Pozycje trafiają do archiwum, import ma podgląd, a pliki nie są
            publiczne.
          </small>
        </span>
      </section>

      <div className="records-overview" aria-label="Stan kartotek">
        <article>
          <DoorOpen aria-hidden="true" />
          <span>Sale</span>
          <strong>{rooms.length}</strong>
        </article>
        <article>
          <GraduationCap aria-hidden="true" />
          <span>Grupy</span>
          <strong>{groups.length}</strong>
        </article>
        <article>
          <UserRoundCheck aria-hidden="true" />
          <span>Wykładowcy</span>
          <strong>{personCounts.teachers}</strong>
        </article>
        <article>
          <Users aria-hidden="true" />
          <span>Uczniowie</span>
          <strong>{personCounts.students}</strong>
        </article>
      </div>

      <nav className="records-jump-nav" aria-label="Sekcje kartotek">
        <a href="#import">Import</a>
        <a href="#sale">Sale</a>
        <a href="#grupy">Grupy</a>
        <a href="#osoby">Osoby</a>
      </nav>

      <ImportWizard />
      <QuickRecordForms />

      <section className="records-card records-list-card" id="sale">
        <RecordsHeading
          icon={<DoorOpen aria-hidden="true" />}
          title="Sale"
          description="Zasób używany przy układaniu grafiku."
          count={rooms.length}
        />
        {rooms.length === 0 ? (
          <RecordsEmpty
            title="Nie ma jeszcze sal"
            text="Dodaj pierwszą salę powyżej albo użyj importu."
          />
        ) : (
          <div className="records-table-wrap">
            <table className="records-table">
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>Miejsca</th>
                  <th>Zajęcia</th>
                  <th>
                    <span className="sr-only">Działania</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id}>
                    <td data-label="Nazwa">
                      <strong>{room.name}</strong>
                    </td>
                    <td data-label="Miejsca">{room.capacity ?? "Nie podano"}</td>
                    <td data-label="Zajęcia">{room._count.scheduleSlots}</td>
                    <td data-label="Działania">
                      <ArchiveControl
                        id={room.id}
                        type="room"
                        label={`salę ${room.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="records-card records-list-card" id="grupy">
        <RecordsHeading
          icon={<GraduationCap aria-hidden="true" />}
          title="Grupy"
          description="Grupa połączy uczniów, wykładowców i plan lekcji."
          count={groups.length}
        />
        {groups.length === 0 ? (
          <RecordsEmpty
            title="Nie ma jeszcze grup"
            text="Dodaj pierwszą grupę powyżej albo użyj importu."
          />
        ) : (
          <div className="records-table-wrap">
            <table className="records-table">
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>Poziom</th>
                  <th>Uczniowie</th>
                  <th>Wykładowcy</th>
                  <th>
                    <span className="sr-only">Działania</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id}>
                    <td data-label="Nazwa">
                      <strong>{group.name}</strong>
                    </td>
                    <td data-label="Poziom">
                      {cefrLabels[group.cefrLevel as keyof typeof cefrLabels]}
                    </td>
                    <td data-label="Uczniowie">{group._count.enrollments}</td>
                    <td data-label="Wykładowcy">{group._count.teachers}</td>
                    <td data-label="Działania">
                      <ArchiveControl
                        id={group.id}
                        type="group"
                        label={`grupę ${group.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="records-card records-list-card" id="osoby">
        <RecordsHeading
          icon={<Users aria-hidden="true" />}
          title="Osoby"
          description="Wykładowcy, rodzice i uczniowie widoczni tylko w tej szkole."
          count={people.length}
        />
        {people.length === 0 ? (
          <RecordsEmpty
            title="Nie ma jeszcze osób"
            text="Dodaj pojedynczą kartotekę albo użyj importu."
          />
        ) : (
          <div className="records-table-wrap">
            <table className="records-table">
              <thead>
                <tr>
                  <th>Osoba</th>
                  <th>Rola</th>
                  <th>Konto</th>
                  <th>Powiązania</th>
                  <th>
                    <span className="sr-only">Działania</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => {
                  const role =
                    person.role as keyof typeof recordRoleLabels;
                  const relations =
                    role === "TEACHER"
                      ? `${person._count.groupTeaching} grup`
                      : role === "PARENT"
                        ? `${person._count.parentLinks} dzieci`
                        : `${person._count.enrollments} grup`;
                  return (
                    <tr key={person.id}>
                      <td data-label="Osoba">
                        <strong>{person.name}</strong>
                        <small>{person.externalId ?? "Bez identyfikatora"}</small>
                      </td>
                      <td data-label="Rola">
                        {recordRoleLabels[role] ?? "Użytkownik"}
                      </td>
                      <td data-label="Konto">
                        {person.accounts.length > 0
                          ? maskEmail(person.email)
                          : "Bez aktywnego konta"}
                      </td>
                      <td data-label="Powiązania">{relations}</td>
                      <td data-label="Działania">
                        <ArchiveControl
                          id={person.id}
                          type="person"
                          label={`kartotekę ${person.name}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="records-card import-history-card">
        <RecordsHeading
          icon={<Database aria-hidden="true" />}
          title="Ostatnie importy"
          description="Historia bez treści arkusza i danych osobowych w logach."
          count={recentImports.length}
        />
        {recentImports.length === 0 ? (
          <RecordsEmpty
            title="Brak historii"
            text="Pierwszy podgląd importu pojawi się tutaj."
          />
        ) : (
          <div className="import-history">
            {recentImports.map((item) => (
              <article key={item.id}>
                <span>
                  <strong>{item.sourceFile.originalName}</strong>
                  <small>
                    {formatDate(item.createdAt)} · {item.totalRows} wierszy
                  </small>
                </span>
                <span className={`import-status status-${item.status.toLowerCase()}`}>
                  {importStatusLabel(item.status)}
                </span>
                <small>
                  {item.errorRows} błędów · {item.duplicateRows} duplikatów
                </small>
              </article>
            ))}
          </div>
        )}
      </section>
    </AuthenticatedPanelShell>
  );
}

function RecordsHeading({
  icon,
  title,
  description,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number;
}) {
  return (
    <div className="records-card-heading">
      <span className="record-icon record-icon-blue">{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
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
  type: "room" | "group" | "person";
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Warsaw",
  }).format(date);
}

function importStatusLabel(status: string) {
  return (
    {
      PREVIEW_READY: "Podgląd",
      COMMITTED: "Zapisany",
      FAILED: "Błąd",
      ARCHIVED: "Archiwum",
    }[status] ?? status
  );
}
