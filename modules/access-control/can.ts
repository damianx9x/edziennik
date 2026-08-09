export type Role =
  | "SYSTEM_OWNER"
  | "DIRECTOR"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

export type Action =
  | "view:owner-dashboard"
  | "manage:school"
  | "view:director-dashboard"
  | "view:teacher-dashboard"
  | "view:parent-dashboard"
  | "view:student-dashboard"
  | "view:group"
  | "edit:group"
  | "view:schedule"
  | "manage:schedule"
  | "edit:lesson"
  | "view:student"
  | "edit:attendance"
  | "manage:contracts"
  | "view:contract"
  | "accept:contract"
  | "manage:payments"
  | "view:payment";

export type Actor = {
  id: string;
  schoolId: string;
  role: Role;
};

export type Resource = {
  schoolId: string;
  ownerId?: string;
  teacherIds?: readonly string[];
  parentIds?: readonly string[];
};

/**
 * Central authorization policy. The default is always deny.
 *
 * This is intentionally pure so every rule can be tested without a database.
 * A server-side loader must build Resource from trusted database relations.
 */
export function can(
  actor: Actor,
  action: Action,
  resource: Resource,
): boolean {
  const protectedFamilyActions: readonly Action[] = [
    "manage:contracts",
    "view:contract",
    "accept:contract",
    "manage:payments",
    "view:payment",
  ];

  // Diagnostyka nie uzasadnia stałego dostępu do treści umów i rozliczeń.
  // Ewentualny dostęp serwisowy wymaga osobnego mechanizmu break-glass.
  if (
    actor.role === "SYSTEM_OWNER" &&
    protectedFamilyActions.includes(action)
  ) {
    return false;
  }

  if (actor.role === "SYSTEM_OWNER") {
    return true;
  }

  if (actor.schoolId !== resource.schoolId) {
    return false;
  }

  if (action === "view:owner-dashboard") {
    return false;
  }

  if (actor.role === "DIRECTOR") {
    return true;
  }

  if (
    action === "view:director-dashboard" ||
    action === "manage:school" ||
    action === "manage:schedule" ||
    action === "manage:contracts" ||
    action === "manage:payments"
  ) {
    return false;
  }

  if (action === "view:teacher-dashboard") {
    return actor.role === "TEACHER";
  }

  if (action === "view:parent-dashboard") {
    return actor.role === "PARENT";
  }

  if (action === "view:student-dashboard") {
    return actor.role === "STUDENT";
  }

  if (
    action === "view:group" ||
    action === "edit:group" ||
    action === "view:schedule" ||
    action === "edit:lesson"
  ) {
    return (
      actor.role === "TEACHER" &&
      resource.teacherIds?.includes(actor.id) === true
    );
  }

  if (action === "edit:attendance") {
    return (
      actor.role === "TEACHER" &&
      resource.teacherIds?.includes(actor.id) === true
    );
  }

  if (action === "view:student") {
    if (actor.role === "STUDENT") {
      return resource.ownerId === actor.id;
    }

    if (actor.role === "PARENT") {
      return resource.parentIds?.includes(actor.id) === true;
    }

    if (actor.role === "TEACHER") {
      return resource.teacherIds?.includes(actor.id) === true;
    }
  }

  if (
    action === "view:contract" ||
    action === "accept:contract" ||
    action === "view:payment"
  ) {
    return (
      actor.role === "PARENT" &&
      resource.parentIds?.includes(actor.id) === true
    );
  }

  return false;
}
