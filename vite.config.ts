import { defineConfig } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
// const SCRIPT_PATH = resolve(__dirname, "scripts", "build_pogo_subset.py"); // Python script (commented out)
const SCRIPT_PATH = resolve(__dirname, "src", "scripts", "build-stats.mjs"); // JavaScript script
const ROOT_DIR = resolve(__dirname);

interface RunResult {
  stdout: string;
  stderr: string;
  code: number;
}

function runWithCommand(command: string, args: string[]): Promise<RunResult> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: ROOT_DIR,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err: Error) => {
      rejectRun(err);
    });

    child.on("close", (code: number | null) => {
      if (code === 0) {
        resolveRun({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          code: code ?? 0,
        });
      } else {
        const error = new Error(
          `JavaScript exited with code ${code}${
            stderr ? `: ${stderr.trim()}` : ""
          }`
        );
        (error as any).stdout = stdout;
        (error as any).stderr = stderr;
        (error as any).code = code;
        (error as any).command = command;
        rejectRun(error);
      }
    });
  });
}

// async function runPythonScript(): Promise<RunResult> {
//   const candidates = [process.env.PYTHON, "python3", "python", "py"].filter(
//     Boolean,
//   ) as string[];
//   const args = [SCRIPT_PATH];
//   const errors: Array<{ command: string; code: unknown; error: any }> = [];

//   for (const command of candidates) {
//     try {
//       return await runWithCommand(command, args);
//     } catch (error: any) {
//       const exitCode = error?.code;
//       if (exitCode === "ENOENT" || exitCode === 9009 || exitCode === 127) {
//         errors.push({ command, code: exitCode, error });
//         continue;
//       }
//       throw error;
//     }
//   }

//   const attemptedCommands = errors.length
//     ? errors.map((item) => item.command).join(", ")
//     : candidates.join(", ");
//   const message = `Unable to run Python. Tried commands: ${attemptedCommands}. Ensure Python 3.8+ is available in PATH.`;
//   const error = new Error(message);
//   (error as any).errors = errors;
//   throw error;
// }

async function runJavaScriptScript(): Promise<RunResult> {
  const candidates = [process.env.NODE, "node"].filter(Boolean) as string[];
  const args = [SCRIPT_PATH];
  const errors: Array<{ command: string; code: unknown; error: any }> = [];

  for (const command of candidates) {
    try {
      return await runWithCommand(command, args);
    } catch (error: any) {
      const exitCode = error?.code;
      if (exitCode === "ENOENT" || exitCode === 9009 || exitCode === 127) {
        errors.push({ command, code: exitCode, error });
        continue;
      }
      throw error;
    }
  }

  const attemptedCommands = errors.length
    ? errors.map((item) => item.command).join(", ")
    : candidates.join(", ");
  const message = `Unable to run Node.js. Tried commands: ${attemptedCommands}. Ensure Node.js is available in PATH.`;
  const error = new Error(message);
  (error as any).errors = errors;
  throw error;
}

function createUpdateMiddleware() {
  let running = false;

  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
      return;
    }

    if (running) {
      res.statusCode = 409;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ ok: false, error: "Update already in progress" })
      );
      return;
    }

    running = true;
    const started = performance.now();

    try {
      const result = await runJavaScriptScript();
      const durationMs = Math.round(performance.now() - started);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: true,
          stdout: result.stdout,
          stderr: result.stderr,
          code: result.code,
          durationMs,
          message: "JavaScript data update completed",
        })
      );
    } catch (error: any) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: false,
          error: error?.message ?? "JavaScript update failed",
          stderr: error?.stderr ?? "",
        })
      );
    } finally {
      running = false;
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "pogo-data-update-endpoint",
      configureServer(server) {
        server.middlewares.use("/api/update-data", createUpdateMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use("/api/update-data", createUpdateMiddleware());
      },
    },
  ],
});
