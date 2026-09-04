"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/server/db";
import { requireSystemOwner } from "@/modules/identity/auth/session";

import {
  configurableModuleKeys,
  configurableRoles,
  moduleAccessSchema,
  moduleCatalog,
} from "./catalog";

export async function saveModuleAccessAction(input: unknown) {
  const session = await requireSystemOwner("/panel/bog/ustawienia");
  const parsed = moduleAccessSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Nie udało się zapisać. Odśwież stronę i spróbuj ponownie." };
  }

  const normalized = structuredClone(parsed.data);
  for (const key of configurableModuleKeys) {
    for (const role of configurableRoles) {
      if (!moduleCatalog[key].supportedRoles.includes(role)) {
        normalized[key][role] = false;
      }
    }
  }

  try {
    await db.$transaction([
      db.school.update({
        where: { id: session.user.schoolId },
        data: { moduleAccess: normalized },
      }),
      db.auditLog.create({
        data: {
          schoolId: session.user.schoolId,
          actorId: session.user.id,
          action: "school.module_access.updated",
          entityType: "School",
          entityId: session.user.schoolId,
          metadata: { policy: normalized },
        },
      }),
    ]);
  } catch {
    return {
      ok: false,
      message: "Nie udało się zapisać ustawień. Spróbuj ponownie za chwilę.",
    };
  }

  revalidatePath("/panel", "layout");
  return { ok: true, message: "Widoczność modułów została zapisana." };
}
