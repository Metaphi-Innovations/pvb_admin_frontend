const { spawn } = require("node:child_process");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const [, , command = "dev", ...extraArgs] = process.argv;
const nextBin = require.resolve("next/dist/bin/next");
const configuredPort = process.env.FRONTEND_PORT || process.env.PORT || "3000";

const child = spawn(
  process.execPath,
  [nextBin, command, "-p", configuredPort, ...extraArgs],
  {
    stdio: "inherit",
    env: process.env,
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
