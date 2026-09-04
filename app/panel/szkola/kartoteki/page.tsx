import {
  DoorOpen,
  GraduationCap,
  MapPin,
  Plus,
  ShieldCheck,
  UserRoundCheck,
  Users,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/server/db";
import { requireSchoolStaff } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import {
  PersonDirectory,
  type PersonDirectoryRecord,
} from "@/modules/people/components/person-directory";
import { QuickRecordForms } from "@/modules/people/components/quick-record-forms";
import type { RecordHistoryEntry } from "@/modules/records/components/record-edit-form";
import { ResourceDirectory } from "@/modules/records/components/resource-directory";

export const metadata: Metadata = { title: "Kartoteki szkoły" };
export const dynamic = "force-dynamic";

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ stan?: string }>;
}) {
  const session = await requireSchoolStaff("/panel/szkola/kartoteki");
  const params = await searchParams;
  const schoolId = session.user.schoolId;
  const isDirector =
    session.user.role === "SYSTEM_OWNER" ||
    session.user.role === "DIRECTOR";
  const isSystemOwner = session.user.role === "SYSTEM_OWNER";
  const showArchived = isSystemOwner && params.stan === "archiwalne";
  const actorRole: "DIRECTOR" | "TEACHER" = isDirector
    ? "DIRECTOR"
    : "TEACHER";
  const teaching = isDirector
    ? []
    : await db.groupTeacher.findMany({
        where: { teacherId: session.user.id, archivedAt: null },
        select: { groupId: true },
      });
  const teachingGroupIds = teaching.map((item) => item.groupId);

  const peopleWhere = isDirector
    ? {}
    : {
        OR: [
          { id: session.user.id },
          {
            enrollments: {
              some: { groupId: { in: teachingGroupIds }, status: "ACTIVE" as const },
            },
          },
          {
            parentLinks: {
              some: {
                archivedAt: null,
                child: {
                  enrollments: {
                    some: {
                      groupId: { in: teachingGroupIds },
                      status: "ACTIVE" as const,
                    },
                  },
                },
              },
            },
          },
        ],
      };

  const [locations, rooms, groups, people] = await Promise.all([
    db.location.findMany({
      where: { schoolId, isActive: true, archivedAt: null },
      orderBy: [{ isOnline: "asc" }, { name: "asc" }],
      select: { id: true, name: true, address: true, isOnline: true },
    }),
    db.room.findMany({
      where: {
        schoolId,
        archivedAt: showArchived ? { not: null } : null,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        capacity: true,
        locationId: true,
        location: { select: { name: true } },
        schedulingRequirements: {
          where: { isActive: true },
          select: { group: { select: { id: true, name: true } } },
        },
        _count: { select: { scheduleSlots: true } },
      },
    }),
    db.courseGroup.findMany({
      where: {
        schoolId,
        archivedAt: showArchived ? { not: null } : null,
        ...(isDirector ? {} : { id: { in: teachingGroupIds } }),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        cefrLevel: true,
        locationId: true,
        location: { select: { name: true } },
        _count: {
          select: {
            enrollments: { where: { status: "ACTIVE" } },
            teachers: { where: { archivedAt: null } },
          },
        },
        teachers: {
          where: { archivedAt: null },
          select: { teacher: { select: { id: true, name: true } } },
        },
        enrollments: {
          where: { status: "ACTIVE" },
          select: { student: { select: { id: true, name: true } } },
        },
        schedulingRequirement: { select: { preferredRoomId: true } },
      },
    }),
    db.user.findMany({
      where: {
        schoolId,
        role: { in: ["TEACHER", "PARENT", "STUDENT"] },
        archivedAt: showArchived ? { not: null } : null,
        ...peopleWhere,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
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
          select: { group: { select: { id: true, name: true } } },
        },
        parentLinks: {
          where: { archivedAt: null },
          select: { child: { select: { id: true, name: true } } },
        },
        childLinks: {
          where: { archivedAt: null },
          select: { parent: { select: { id: true, name: true } } },
        },
        enrollments: {
          where: { status: "ACTIVE" },
          select: {
            group: {
              select: {
                id: true,
                name: true,
                teachers: {
                  where: { archivedAt: null },
                  select: { teacher: { select: { id: true, name: true } } },
                },
              },
            },
          },
        },
        studentAvailabilityWindows: {
          orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
          select: { weekday: true, startMinute: true, endMinute: true },
        },
      },
    }),
  ]);

  const visibleIds = [
    ...people.map((item) => item.id),
    ...groups.map((item) => item.id),
    ...rooms.map((item) => item.id),
  ];
  const [changeRequests, auditChanges] = await Promise.all([
    db.recordChangeRequest.findMany({
      where: { schoolId, entityId: { in: visibleIds } },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        entityId: true,
        status: true,
        changedFields: true,
        createdAt: true,
        reviewedAt: true,
        requestedBy: { select: { name: true } },
        reviewedBy: { select: { name: true } },
      },
    }),
    db.auditLog.findMany({
      where: {
        schoolId,
        entityId: { in: visibleIds },
        action: {
          in: [
            "records.change.approved_directly",
            "records.group.assigned",
            "records.student.assigned",
            "records.parent.linked",
            "records.relationships.changed",
            "records.student_availability.changed",
            "records.record.restored",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        actor: { select: { name: true } },
        action: true,
      },
    }),
  ]);
  const historyById: Record<string, RecordHistoryEntry[]> = {};
  for (const request of changeRequests) {
    const entry: RecordHistoryEntry = {
      id: request.id,
      status: request.status,
      label:
        request.status === "PENDING"
          ? "Propozycja zmiany"
          : request.status === "APPROVED"
            ? "Zmiana zatwierdzona"
            : "Zmiana odrzucona",
      actorName: request.requestedBy.name,
      reviewerName: request.reviewedBy?.name ?? null,
      createdAt: formatHistoryDate(request.createdAt),
      reviewedAt: request.reviewedAt
        ? formatHistoryDate(request.reviewedAt)
        : null,
      sortKey: request.createdAt.toISOString(),
      fields: request.changedFields,
    };
    (historyById[request.entityId] ??= []).push(entry);
  }
  for (const change of auditChanges) {
    if (!change.entityId) continue;
    const metadata =
      change.metadata && typeof change.metadata === "object"
        ? (change.metadata as { changedFields?: unknown })
        : null;
    const fields = Array.isArray(metadata?.changedFields)
      ? metadata.changedFields.filter(
          (value): value is string => typeof value === "string",
        )
      : [];
    (historyById[change.entityId] ??= []).push({
      id: change.id,
      status: "DIRECT",
      label:
        change.action === "records.group.assigned"
          ? "Przypisano do grupy"
          : change.action === "records.student.assigned"
            ? "Dodano ucznia do grupy"
            : change.action === "records.parent.linked"
              ? "Zapisano relację rodzinną"
              : change.action === "records.record.restored"
                ? "Przywrócono z archiwum"
              : "Zmiana zapisana przez dyrektora",
      actorName: change.actor?.name ?? "System",
      createdAt: formatHistoryDate(change.createdAt),
      sortKey: change.createdAt.toISOString(),
      fields,
    });
  }
  for (const entries of Object.values(historyById)) {
    entries.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }

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
      isArchived: person.status === "ARCHIVED",
      hasAccount: person.accounts.length > 0,
      relationLabel: formatRelationCount(role, relations.length),
      relations,
      childIds: person.parentLinks.map((item) => item.child.id),
      parentIds: person.childLinks.map((item) => item.parent.id),
      groupIds:
        role === "TEACHER"
          ? person.groupTeaching.map((item) => item.group.id)
          : person.enrollments.map((item) => item.group.id),
      derivedTeachers: person.enrollments.flatMap((item) =>
        item.group.teachers.map((teacher) => ({
          id: teacher.teacher.id,
          name: teacher.teacher.name,
          groupName: item.group.name,
        }))),
      availabilityWindows: person.studentAvailabilityWindows,
    };
  });
  const personCounts = directoryPeople.reduce(
    (counts, person) => {
      if (person.role === "TEACHER") counts.teachers += 1;
      if (person.role === "STUDENT") counts.students += 1;
      return counts;
    },
    { teachers: 0, students: 0 },
  );

  return (
    <AuthenticatedPanelShell session={session} active="records">
      <header className="role-panel-heading records-page-heading">
        <div>
          <span className="section-kicker">Dane szkoły</span>
          <h1>Kartoteki</h1>
          <p>
            {isSystemOwner
              ? "Jako twórca widzisz wszystkie aktywne kartoteki szkoły i możesz usuwać je z aktywnego obiegu. Każda operacja pozostaje w audycie."
              : "Otwórz kartę osoby, grupy lub sali. Każda zmiana zostawia czytelny ślad."}
          </p>
        </div>
        {isDirector ? (
          <div className="records-heading-actions">
            <Link
              className="button button-secondary"
              href="/panel/szkola/narzedzia#dane"
            >
              <Wrench aria-hidden="true" /> Narzędzia danych
            </Link>
            <a className="button button-primary" href="#dodaj-kartoteke">
              <Plus aria-hidden="true" /> Dodaj kartotekę
            </a>
          </div>
        ) : null}
      </header>

      <nav className="records-section-tabs" aria-label="Dział Kartoteki">
        <Link className={!showArchived ? "active" : undefined} href="/panel/szkola/kartoteki">
          Aktywne kartoteki
        </Link>
        {isSystemOwner ? (
          <Link className={showArchived ? "active" : undefined} href="/panel/szkola/kartoteki?stan=archiwalne">
            Archiwum
          </Link>
        ) : null}
        {isDirector ? (
          <Link href="/panel/szkola/zaproszenia">Zaproszenia i dostęp</Link>
        ) : null}
      </nav>

      <section className="records-summary-strip" aria-label="Stan kartotek">
        <a href="#lokalizacje">
          <MapPin aria-hidden="true" />
          <span><strong>{locations.length}</strong>Lokalizacje</span>
        </a>
        <a href="#osoby">
          <Users aria-hidden="true" />
          <span><strong>{personCounts.students}</strong>Uczniowie</span>
        </a>
        <a href="#osoby">
          <UserRoundCheck aria-hidden="true" />
          <span><strong>{personCounts.teachers}</strong>Wykładowcy</span>
        </a>
        <a href="#lokalizacje">
          <GraduationCap aria-hidden="true" />
          <span><strong>{groups.length}</strong>Grupy</span>
        </a>
        <a href="#lokalizacje">
          <DoorOpen aria-hidden="true" />
          <span><strong>{rooms.length}</strong>Sale</span>
        </a>
      </section>

      <section className="records-safety-banner records-safety-compact">
        <ShieldCheck aria-hidden="true" />
        <span>
          <strong>
            {isDirector
              ? "Zmiany zapisujesz od razu"
              : "Twoje zmiany zatwierdza dyrektor"}
          </strong>
          <small>Historia kartoteki pokazuje autora, zakres i decyzję.</small>
        </span>
      </section>

      {isDirector && !showArchived ? (
        <section className="records-action-zone" id="dodaj-kartoteke">
          <div>
            <span className="section-kicker">Jedno miejsce do dodawania</span>
            <h2>Co chcesz utworzyć?</h2>
            <p>Wybierz osobę lub zasób. Formularz pokaże tylko potrzebne pola.</p>
          </div>
          <QuickRecordForms locations={locations} />
        </section>
      ) : null}

      <div id="osoby" className="records-directory-zone">
        <span className="section-kicker">Osoby</span>
        <h2>Uczniowie, rodzice i wykładowcy</h2>
        <p>Najpierw wybierz rolę lub wyszukaj nazwisko, potem otwórz pełną kartę.</p>
        <PersonDirectory
          people={directoryPeople}
          actorRole={actorRole}
          isSystemOwner={isSystemOwner}
          historyById={historyById}
          relationOptions={{
            students: directoryPeople.filter((person) => person.role === "STUDENT").map((person) => ({ id: person.id, name: person.name })),
            parents: directoryPeople.filter((person) => person.role === "PARENT").map((person) => ({ id: person.id, name: person.name })),
            groups: groups.map((group) => ({ id: group.id, name: group.name, meta: group.location.name })),
          }}
        />
      </div>

      <div className="records-directory-zone" id="zasoby">
        <span className="section-kicker">Organizacja zajęć</span>
        <h2>Lokalizacje, grupy i sale</h2>
        <p>Zasoby są pogrupowane według lokalizacji, żeby łatwiej układać grafik.</p>
        <ResourceDirectory
          actorRole={actorRole}
          isSystemOwner={isSystemOwner}
          historyById={historyById}
          locations={locations}
          groups={groups.map((group) => ({
            id: group.id,
            name: group.name,
            cefrLevel: group.cefrLevel,
            locationId: group.locationId,
            locationName: group.location.name,
            studentCount: group._count.enrollments,
            teacherCount: group._count.teachers,
            studentIds: group.enrollments.map((item) => item.student.id),
            teacherIds: group.teachers.map((item) => item.teacher.id),
            studentNames: group.enrollments.map((item) => item.student.name),
            teacherNames: group.teachers.map((item) => item.teacher.name),
            preferredRoomId: group.schedulingRequirement?.preferredRoomId ?? null,
            isArchived: showArchived,
          }))}
          rooms={rooms.map((room) => ({
            id: room.id,
            name: room.name,
            capacity: room.capacity,
            locationId: room.locationId,
            locationName: room.location.name,
            scheduleCount: room._count.scheduleSlots,
            preferredGroupIds: room.schedulingRequirements.map((item) => item.group.id),
            isArchived: showArchived,
          }))}
          relationOptions={{
            students: directoryPeople.filter((person) => person.role === "STUDENT").map((person) => ({ id: person.id, name: person.name })),
            teachers: directoryPeople.filter((person) => person.role === "TEACHER").map((person) => ({ id: person.id, name: person.name })),
            groups: groups.map((group) => ({ id: group.id, name: group.name, meta: group.location.name })),
            rooms: rooms.map((room) => ({ id: room.id, name: room.name, meta: room.location.name })),
          }}
        />
      </div>
    </AuthenticatedPanelShell>
  );
}

function formatHistoryDate(date: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Warsaw",
  }).format(date);
}

function formatRelationCount(
  role: PersonDirectoryRecord["role"],
  count: number,
) {
  if (role === "PARENT") return `${count} ${count === 1 ? "dziecko" : "dzieci"}`;
  const lastTwo = count % 100;
  const last = count % 10;
  const noun =
    count === 1
      ? "grupa"
      : last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)
        ? "grupy"
        : "grup";
  return `${count} ${noun}`;
}
