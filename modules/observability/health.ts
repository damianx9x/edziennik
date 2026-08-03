export type ApplicationHealth = {
  status: "ok" | "degraded";
};

export async function checkApplicationHealth(
  databaseProbe: () => Promise<unknown>,
): Promise<ApplicationHealth> {
  try {
    await databaseProbe();
    return { status: "ok" };
  } catch {
    return { status: "degraded" };
  }
}
