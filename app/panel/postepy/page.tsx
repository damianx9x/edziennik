import { ShieldCheck, TrendingUp } from "lucide-react";
import type { Metadata } from "next";

import { requireActiveSession } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { ProgressWorkspace, type StudentProgressView } from "@/modules/progress/components/progress-workspace";
import { listStudentProgress } from "@/modules/progress/service";

export const metadata: Metadata = { title: "Postępy ucznia" };
export const dynamic = "force-dynamic";

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ uczen?: string }> }) {
  const session = await requireActiveSession("/panel/postepy");
  const [students, params] = await Promise.all([
    listStudentProgress({ id: session.user.id, schoolId: session.user.schoolId, role: session.user.role }),
    searchParams,
  ]);
  const view: StudentProgressView[] = students.map((student) => ({
    ...student,
    progressAsStudent: student.progressAsStudent.map((observation) => ({
      ...observation,
      observedAt: observation.observedAt.toISOString(),
      scheduleSlot: observation.scheduleSlot ? { ...observation.scheduleSlot, startAt: observation.scheduleSlot.startAt.toISOString() } : null,
    })),
    attendanceAsStudent: student.attendanceAsStudent.map((attendance) => ({
      ...attendance,
      scheduleSlot: { ...attendance.scheduleSlot, startAt: attendance.scheduleSlot.startAt.toISOString() },
    })),
  }));
  const copy = {
    SYSTEM_OWNER: ["Widok całej szkoły", "Postępy uczniów", "Masz pełny dostęp do obserwacji, obecności i narzędzi zapisu postępów."],
    DIRECTOR: ["Widok całej szkoły", "Postępy uczniów", "Przeglądaj opisowe obserwacje i wspieraj spójny sposób informacji zwrotnej."],
    TEACHER: ["Twoje przypisane grupy", "Postępy uczniów", "Zapisuj konkretne obserwacje i pokazuj kolejny mały krok w nauce angielskiego."],
    PARENT: ["Tylko powiązane dzieci", "Postępy dziecka", "Zobacz zapisane obserwacje, obecność i krótką informację od wykładowcy."],
    STUDENT: ["Twój rozwój", "Moje postępy", "Sprawdź, co już działa i na czym warto skupić się podczas kolejnych zajęć."],
  }[session.user.role];
  return (
    <AuthenticatedPanelShell session={session} active="progress">
      <header className="role-panel-heading progress-heading">
        <div><span className="section-kicker">{copy[0]}</span><h1>{copy[1]}</h1><p>{copy[2]}</p></div>
        <span className="role-security-chip"><ShieldCheck aria-hidden="true" /> Dane tylko właściwych uczniów</span>
      </header>
      <div className="progress-intro-note"><TrendingUp aria-hidden="true" /><p>Postęp opisujemy na podstawie rzeczywistych obserwacji. System nie ocenia automatycznie i nie przewiduje zachowania dziecka.</p></div>
      <ProgressWorkspace role={session.user.role === "SYSTEM_OWNER" ? "DIRECTOR" : session.user.role} students={view} initialStudentId={params.uczen} />
    </AuthenticatedPanelShell>
  );
}
