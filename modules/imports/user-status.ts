type UserStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export function statusForImportedExistingUser(
  status: UserStatus,
): Exclude<UserStatus, "ARCHIVED"> {
  return status === "ARCHIVED" ? "INVITED" : status;
}
