import type { Prisma } from "@/app/generated/prisma/client";

type ScheduleLockClient = Pick<Prisma.TransactionClient, "$executeRaw">;
type ScheduleGenerationClient = Pick<
  Prisma.TransactionClient,
  "scheduleGeneration"
>;

export async function lockScheduleResources(
  transaction: ScheduleLockClient,
  schoolId: string,
) {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${schoolId}))`;
}

export async function discardReadyScheduleGenerations(
  transaction: ScheduleGenerationClient,
  schoolId: string,
) {
  const result = await transaction.scheduleGeneration.updateMany({
    where: {
      schoolId,
      status: "READY",
    },
    data: {
      status: "DISCARDED",
    },
  });
  return result.count;
}
