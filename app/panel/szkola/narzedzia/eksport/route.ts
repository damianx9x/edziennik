import { db } from "@/lib/server/db";
import { requireDirector } from "@/modules/identity/auth/session";
import {
  createRecordsCsv,
  splitPersonName,
  type ExportRow,
} from "@/modules/imports/export";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireDirector("/panel/szkola/narzedzia");
  const schoolId = session.user.schoolId;
  const [rooms, groups, people, relations] = await Promise.all([
    db.room.findMany({
      where: { schoolId, archivedAt: null },
      orderBy: { name: "asc" },
      select: {
        name: true,
        capacity: true,
        location: { select: { name: true } },
      },
    }),
    db.courseGroup.findMany({
      where: { schoolId, archivedAt: null },
      orderBy: { name: "asc" },
      select: {
        name: true,
        cefrLevel: true,
        location: { select: { name: true } },
      },
    }),
    db.user.findMany({
      where: {
        schoolId,
        archivedAt: null,
        role: { in: ["TEACHER", "PARENT", "STUDENT"] },
      },
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
          take: 1,
          select: { group: { select: { name: true } } },
        },
      },
    }),
    db.parentChild.findMany({
      where: { schoolId, archivedAt: null },
      select: {
        parent: { select: { email: true } },
        child: { select: { externalId: true } },
      },
    }),
  ]);

  const rows: ExportRow[] = [
    ...rooms.map((room) => ({
      typ: "sala",
      nazwa: room.name,
      pojemnosc: room.capacity,
      lokalizacja: room.location.name,
    })),
    ...groups.map((group) => ({
      typ: "grupa",
      nazwa: group.name,
      poziom: group.cefrLevel,
      lokalizacja: group.location.name,
    })),
    ...people.map((person) => {
      const { firstName, lastName } = splitPersonName(person.name);
      return {
        typ: {
          TEACHER: "wykladowca",
          PARENT: "rodzic",
          STUDENT: "uczen",
        }[person.role]!,
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
        grupa: person.enrollments[0]?.group.name,
      };
    }),
    ...relations
      .filter(
        (relation) =>
          relation.parent.email && relation.child.externalId,
      )
      .map((relation) => ({
        typ: "relacja",
        rodzic_email: relation.parent.email,
        dziecko_id: relation.child.externalId,
      })),
  ];
  const csv = createRecordsCsv(rows);
  const date = new Date().toISOString().slice(0, 10);

  await db.auditLog.create({
    data: {
      schoolId,
      actorId: session.user.id,
      action: "records.export.downloaded",
      entityType: "School",
      entityId: schoolId,
      metadata: {
        roomCount: rooms.length,
        groupCount: groups.length,
        personCount: people.length,
        relationCount: relations.length,
      },
    },
  });

  return new Response(csv, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="kla-kartoteki-${date}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
