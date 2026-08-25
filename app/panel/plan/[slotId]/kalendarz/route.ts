import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/server/db";
import { requireActiveSession } from "@/modules/identity/auth/session";

export const dynamic = "force-dynamic";

function calendarDate(value: Date) {
  return value.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

function escapeCalendarText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slotId: string }> },
) {
  const session = await requireActiveSession("/panel/plan");
  const { slotId } = await context.params;
  const parsed = z.string().uuid().safeParse(slotId);
  if (!parsed.success) {
    return new NextResponse("Nie rozpoznano lekcji.", { status: 404 });
  }

  const slot = await db.scheduleSlot.findFirst({
    where: {
      id: parsed.data,
      schoolId: session.user.schoolId,
      archivedAt: null,
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      topic: true,
      teacherId: true,
      group: {
        select: {
          name: true,
          teachers: { where: { archivedAt: null }, select: { teacherId: true } },
          enrollments: {
            where: { status: "ACTIVE" },
            select: {
              studentId: true,
              student: {
                select: {
                  childLinks: {
                    where: { archivedAt: null },
                    select: { parentId: true },
                  },
                },
              },
            },
          },
        },
      },
      room: { select: { name: true, location: { select: { name: true } } } },
      teacher: { select: { name: true } },
    },
  });
  if (!slot) return new NextResponse("Lekcja nie istnieje.", { status: 404 });

  const role = session.user.role;
  const allowed =
    role === "DIRECTOR" ||
    (role === "TEACHER" &&
      (slot.teacherId === session.user.id ||
        slot.group.teachers.some((teacher) => teacher.teacherId === session.user.id))) ||
    (role === "STUDENT" &&
      slot.group.enrollments.some((enrollment) => enrollment.studentId === session.user.id)) ||
    (role === "PARENT" &&
      slot.group.enrollments.some((enrollment) =>
        enrollment.student.childLinks.some((link) => link.parentId === session.user.id),
      ));
  if (!allowed) return new NextResponse("Brak dostępu.", { status: 403 });

  const summary = `King's Language Academy — ${slot.group.name}`;
  const description = [slot.topic ? `Temat: ${slot.topic}` : null, `Wykładowca: ${slot.teacher.name}`]
    .filter(Boolean)
    .join("\n");
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//King's Language Academy//eDziennik//PL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${slot.id}@kingslanguageacademy.pl`,
    `DTSTAMP:${calendarDate(new Date())}`,
    `DTSTART:${calendarDate(slot.startAt)}`,
    `DTEND:${calendarDate(slot.endAt)}`,
    `SUMMARY:${escapeCalendarText(summary)}`,
    `LOCATION:${escapeCalendarText(`${slot.room.location.name} — ${slot.room.name}`)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Za 30 minut zaczynają się zajęcia z angielskiego.",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="kla-zajecia.ics"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
