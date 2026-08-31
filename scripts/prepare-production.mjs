import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const projectDir = process.cwd();
const standaloneDir = path.join(projectDir, ".next", "standalone");

await mkdir(path.join(standaloneDir, ".next"), { recursive: true });
await mkdir(path.join(standaloneDir, ".next", "cache"), { recursive: true });
await cp(
  path.join(projectDir, ".next", "static"),
  path.join(standaloneDir, ".next", "static"),
  { recursive: true, force: true },
);
await cp(path.join(projectDir, "public"), path.join(standaloneDir, "public"), {
  recursive: true,
  force: true,
});
await mkdir(path.join(standaloneDir, "output"), { recursive: true });
await cp(
  path.join(projectDir, "output", "pdf"),
  path.join(standaloneDir, "output", "pdf"),
  { recursive: true, force: true },
);

console.log("Standalone production assets are ready.");
