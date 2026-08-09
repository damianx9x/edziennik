"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/server/db";
import { requireActiveSession } from "@/modules/identity/auth/session";

export async function finishOnboardingAction(formData: FormData) {
  const session = await requireActiveSession("/panel");
  const dismissed = formData.get("result") === "dismissed";
  const now = new Date();
  await db.onboardingProgress.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, schoolId: session.user.schoolId, version: 1, completedAt: dismissed ? null : now, dismissedAt: dismissed ? now : null },
    update: { version: 1, completedAt: dismissed ? null : now, dismissedAt: dismissed ? now : null },
  });
  revalidatePath("/panel", "layout");
}
