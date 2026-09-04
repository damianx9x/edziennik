import { redirect } from "next/navigation";

import { db } from "@/lib/server/db";
import type { ActiveSession } from "@/modules/identity/auth/session";

import {
  defaultModuleAccessPolicy,
  moduleCatalog,
  parseModuleAccessPolicy,
  type ConfigurableModuleKey,
  type ConfigurableRole,
  type ModuleAccessPolicy,
} from "./catalog";

export async function getModuleAccessPolicy(
  schoolId: string,
): Promise<ModuleAccessPolicy> {
  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: { moduleAccess: true },
  });
  return school
    ? parseModuleAccessPolicy(school.moduleAccess)
    : defaultModuleAccessPolicy;
}

export function moduleIsEnabled(
  policy: ModuleAccessPolicy,
  module: ConfigurableModuleKey,
  role: ActiveSession["user"]["role"],
) {
  if (role === "SYSTEM_OWNER") return true;
  if (!(role in policy[module])) return false;
  return policy[module][role as ConfigurableRole] === true;
}

export async function requireEnabledModule(
  session: ActiveSession,
  module: ConfigurableModuleKey,
) {
  if (session.user.role === "SYSTEM_OWNER") return;
  const policy = await getModuleAccessPolicy(session.user.schoolId);
  if (!moduleIsEnabled(policy, module, session.user.role)) {
    redirect(`/panel/modul-wylaczony?modul=${module}`);
  }
}

export function moduleLabel(module: string) {
  return module in moduleCatalog
    ? moduleCatalog[module as ConfigurableModuleKey].label
    : "Ten moduł";
}
