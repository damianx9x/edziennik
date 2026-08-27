import { db } from "../lib/server/db";
import { processEmailDeliveryQueue } from "../modules/messaging/queue";

async function main() {
  const schools = await db.school.findMany({ select: { id: true } });
  let processed = 0;
  for (const school of schools) {
    processed += (await processEmailDeliveryQueue(school.id, 50)).processed;
  }
  console.log(JSON.stringify({ ok: true, processed }));
}

main()
  .catch((error) => {
    console.error("Email queue worker failed.", error instanceof Error ? error.message : "UnknownError");
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
