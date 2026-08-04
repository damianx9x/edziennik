const DEFAULT_POOL_MAX = 5;
const PRISMA_DEV_POOL_MAX = 1;

function isLocalPrismaDevServer(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    const isLoopback = ["127.0.0.1", "localhost", "::1"].includes(
      url.hostname,
    );
    return isLoopback && url.port === "51214";
  } catch {
    return false;
  }
}

export function resolveDatabasePoolMax(
  connectionString: string,
  configuredValue?: string,
): number {
  const fallback = isLocalPrismaDevServer(connectionString)
    ? PRISMA_DEV_POOL_MAX
    : DEFAULT_POOL_MAX;
  const configured = Number.parseInt(configuredValue ?? String(fallback), 10);

  return Number.isFinite(configured) && configured > 0
    ? Math.min(configured, 20)
    : fallback;
}
