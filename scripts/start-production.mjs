import { spawn } from "node:child_process";
import path from "node:path";

const projectDir = process.cwd();
const standaloneDir = path.join(projectDir, ".next", "standalone");
const serverFile = path.join(standaloneDir, "server.js");

const child = spawn(process.execPath, [serverFile], {
  cwd: standaloneDir,
  stdio: "inherit",
  env: {
    ...process.env,
    HOSTNAME: process.env.HOSTNAME || "0.0.0.0",
    PORT: process.env.PORT || "3000",
  },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
