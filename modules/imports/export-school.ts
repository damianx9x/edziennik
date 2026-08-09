import { db } from "@/lib/server/db";

import { splitPersonName, type ExportRow } from "./export";

export async function loadSchoolExportRows(schoolId: string) {
  const [rooms, groups, people, relations] = await Promise.all([
    db.room.findMany({
      where: { schoolId, archivedAt: null },
      orderBy: { name: "asc" },
      select: { name: true, capacity: true, location: { select: { name: true } } },
    }),
    db.courseGroup.findMany({
      where: { schoolId, archivedAt: null },
      orderBy: { name: "asc" },
      select: { name: true, cefrLevel: true, location: { select: { name: true } } },
    }),
    db.user.findMany({
      where: { schoolId, archivedAt: null, role: { in: ["TEACHER", "PARENT", "STUDENT"] } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        name: true,
        role: true,
        email: true,
        phone: true,
        externalId: true,
        enrollments: {
          where: { status: "ACTIVE" },
          orderBy: { joinedAt: "asc" },
          select: { group: { select: { name: true } } },
        },
      },
    }),
    db.parentChild.findMany({
      where: { schoolId, archivedAt: null },
      select: { parent: { select: { email: true } }, child: { select: { externalId: true } } },
    }),
  ]);

  const rows: ExportRow[] = [
    ...rooms.map((room) => ({ typ: "sala", nazwa: room.name, pojemnosc: room.capacity, lokalizacja: room.location.name })),
    ...groups.map((group) => ({ typ: "grupa", nazwa: group.name, poziom: group.cefrLevel, lokalizacja: group.location.name })),
    ...people.flatMap((person) => {
      const { firstName, lastName } = splitPersonName(person.name);
      const base: ExportRow = {
        typ: { TEACHER: "wykladowca", PARENT: "rodzic", STUDENT: "uczen" }[person.role]!,
        identyfikator: person.externalId,
        imie: firstName,
        nazwisko: lastName,
        email:
          person.role === "STUDENT" &&
          person.email.startsWith("record.") &&
          person.email.endsWith("@invalid.example")
            ? null
            : person.email,
        telefon: person.phone,
      };
      if (person.role !== "STUDENT" || person.enrollments.length === 0) return [base];
      return person.enrollments.map((enrollment) => ({ ...base, grupa: enrollment.group.name }));
    }),
    ...relations
      .filter((relation) => relation.parent.email && relation.child.externalId)
      .map((relation) => ({ typ: "relacja", rodzic_email: relation.parent.email, dziecko_id: relation.child.externalId })),
  ];

  return {
    rows,
    counts: {
      roomCount: rooms.length,
      groupCount: groups.length,
      personCount: people.length,
      relationCount: relations.length,
    },
  };
}
