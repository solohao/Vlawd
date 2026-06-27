import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { createServer } from "vite";

const smokeMode = process.argv.includes("--smoke");
const appRoot = resolve(import.meta.dirname, "..");

const build = spawn("npm", ["run", "build"], {
  cwd: appRoot,
  shell: true,
  stdio: "inherit"
});

await new Promise<void>((resolveBuild, rejectBuild) => {
  build.on("exit", (code) => {
    if (code === 0) {
      resolveBuild();
      return;
    }
    rejectBuild(new Error(`TypeScript build failed with exit code ${code ?? "unknown"}`));
  });
  build.on("error", rejectBuild);
});

const server = await createServer({
  configFile: resolve(appRoot, "vite.config.ts")
});
await server.listen();

const address = server.resolvedUrls?.local[0];
if (!address) {
  throw new Error("Vite dev server did not expose a local URL");
}

const electronMain = resolve(appRoot, "packages/main/dist/packages/main/src/electron/main.js");
const electronBin = process.platform === "win32"
  ? resolve(appRoot, "node_modules/.bin/electron.cmd")
  : resolve(appRoot, "node_modules/.bin/electron");

console.log(`AI Cursor V2 renderer: ${address}`);
console.log(`AI Cursor V2 electron main: ${electronMain}`);

const electronProcess = spawn(electronBin, [electronMain], {
  cwd: appRoot,
  shell: true,
  stdio: "inherit",
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: address,
    AI_CURSOR_DEV_SMOKE: smokeMode ? "1" : "0"
  }
});

const shutdown = async (): Promise<void> => {
  electronProcess.kill();
  await server.close();
};

process.on("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});
process.on("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});

const exitCode = await new Promise<number>((resolveExit) => {
  electronProcess.on("exit", (code) => resolveExit(code ?? 0));
});

await server.close();
process.exit(exitCode);
