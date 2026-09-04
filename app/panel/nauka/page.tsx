import { BookOpenCheck, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { requireActiveSession } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { LearningWorkspace, type LearningGroupView } from "@/modules/learning/components/learning-workspace";
import { listLearningOverview } from "@/modules/learning/service";
import { requireEnabledModule } from "@/modules/module-access/server";

export const metadata: Metadata = { title: "Materiały i zadania" };
export const dynamic = "force-dynamic";

export default async function LearningPage() {
  const session = await requireActiveSession("/panel/nauka");
  await requireEnabledModule(session, "learning");
  const groups = await listLearningOverview({
    id: session.user.id,
    schoolId: session.user.schoolId,
    role: session.user.role,
  });
  const view: LearningGroupView[] = groups.map((group) => ({
    ...group,
    learningMaterials: group.learningMaterials.map((material) => ({
      ...material,
      publishedAt: material.publishedAt.toISOString(),
    })),
    homeworkAssignments: group.homeworkAssignments.map((assignment) => ({
      ...assignment,
      dueAt: assignment.dueAt?.toISOString() ?? null,
      publishedAt: assignment.publishedAt.toISOString(),
      submissions: assignment.submissions.map((submission) => ({
        ...submission,
        submittedAt: submission.submittedAt?.toISOString() ?? null,
      })),
    })),
  }));

  const roleCopy = {
    SYSTEM_OWNER: ["Widok całej szkoły", "Materiały i zadania", "Masz pełny dostęp do treści edukacyjnych i narzędzi publikacji."],
    DIRECTOR: ["Nauka w całej szkole", "Materiały i zadania", "Sprawdź pracę grup i publikuj treści bez szukania w rozmowach."],
    TEACHER: ["Twoje przypisane grupy", "Materiały i zadania", "Publikuj materiały, zadawaj pracę i przekazuj krótką informację zwrotną."],
    PARENT: ["Tylko powiązane dzieci", "Materiały i zadania dzieci", "W jednym miejscu zobaczysz zadania, terminy i informację od wykładowcy."],
    STUDENT: ["Twoje grupy", "Materiały i zadania", "Otwórz materiał, oddaj pracę i sprawdź informację od wykładowcy."],
  }[session.user.role];

  return (
    <AuthenticatedPanelShell session={session} active="learning">
      <header className="role-panel-heading learning-heading">
        <div>
          <span className="section-kicker">{roleCopy[0]}</span>
          <h1>{roleCopy[1]}</h1>
          <p>{roleCopy[2]}</p>
        </div>
        <span className="role-security-chip"><ShieldCheck aria-hidden="true" /> Dostęp według przypisań</span>
      </header>
      <div className="learning-intro-note"><BookOpenCheck aria-hidden="true" /><p>Pliki są przechowywane prywatnie. Każda osoba widzi wyłącznie materiały swoich grup.</p></div>
      <LearningWorkspace role={session.user.role === "SYSTEM_OWNER" ? "DIRECTOR" : session.user.role} groups={view} />
    </AuthenticatedPanelShell>
  );
}
