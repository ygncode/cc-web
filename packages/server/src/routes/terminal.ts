import { Hono } from "hono";
import type { AppContext } from "../index.js";

export const terminalRoutes = new Hono<{ Variables: AppContext }>();

// Note: Full PTY support requires WebSocket which is handled in the main server
// These routes provide REST fallbacks and terminal management

interface TerminalSession {
  id: string;
  cwd: string;
  createdAt: Date;
}

const terminalSessions = new Map<string, TerminalSession>();

// Store running processes for cancellation
const runningProcesses = new Map<string, { proc: ReturnType<typeof Bun.spawn>; aborted: boolean }>();

/**
 * Create a new terminal session
 */
terminalRoutes.post("/", async (c) => {
  const cwd = c.get("cwd");
  const id = crypto.randomUUID();

  const session: TerminalSession = {
    id,
    cwd,
    createdAt: new Date(),
  };

  terminalSessions.set(id, session);

  return c.json({ terminal: session }, 201);
});

/**
 * List terminal sessions
 */
terminalRoutes.get("/", (c) => {
  const terminals = Array.from(terminalSessions.values());
  return c.json({ terminals });
});

/**
 * Execute a command (non-interactive fallback)
 */
terminalRoutes.post("/:id/exec", async (c) => {
  const cwd = c.get("cwd");
  const id = c.req.param("id");
  const { command, cols } = await c.req.json<{ command: string; cols?: number }>();

  const session = terminalSessions.get(id);
  if (!session) {
    return c.json({ error: "Terminal not found" }, 404);
  }

  if (!command) {
    return c.json({ error: "Command is required" }, 400);
  }

  try {
    // Create a clean environment for proper terminal output
    // Inherit essential vars but override ones that affect formatting
    const cleanEnv: Record<string, string> = {
      PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
      HOME: process.env.HOME || "",
      USER: process.env.USER || "",
      SHELL: "/bin/sh",
      TERM: "dumb",
      COLUMNS: String(cols || 80),
      LINES: "24",
      // Disable colors and force simple output
      NO_COLOR: "1",
      CLICOLOR: "0",
      CLICOLOR_FORCE: "0",
      // Inherit language settings
      LANG: process.env.LANG || "en_US.UTF-8",
      LC_ALL: process.env.LC_ALL || "",
    };

    // Force ls to single-column mode by replacing bare 'ls' with 'ls -1'
    let finalCommand = command;
    if (/^ls(\s|$)/.test(command.trim())) {
      finalCommand = command.replace(/^ls/, "ls -1");
    }

    const proc = Bun.spawn(["sh", "-c", finalCommand], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
      env: cleanEnv,
    });

    const [rawStdout, rawStderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const exitCode = await proc.exited;

    // Convert tab-separated output to newline-separated (fixes ls column output)
    const fixTabbedOutput = (str: string) => {
      // If output has tabs within lines, convert to newlines
      // This handles ls column output where items are tab-separated
      return str.split("\n").map(line => {
        if (line.includes("\t")) {
          // Replace tabs with newlines, filter empty entries
          return line.split("\t").filter(item => item.trim()).join("\n");
        }
        return line;
      }).join("\n");
    };

    return c.json({
      stdout: fixTabbedOutput(rawStdout),
      stderr: rawStderr,
      exitCode,
    });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

/**
 * Execute a command with SSE streaming (for long-running commands)
 */
terminalRoutes.post("/:id/exec-stream", async (c) => {
  const cwd = c.get("cwd");
  const id = c.req.param("id");
  const { command, cols } = await c.req.json<{ command: string; cols?: number }>();

  const session = terminalSessions.get(id);
  if (!session) {
    return c.json({ error: "Terminal not found" }, 404);
  }

  if (!command) {
    return c.json({ error: "Command is required" }, 400);
  }

  const processId = `${id}-${Date.now()}`;

  // Proper terminal environment with color support
  const env: Record<string, string> = {
    PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
    HOME: process.env.HOME || "",
    USER: process.env.USER || "",
    SHELL: process.env.SHELL || "/bin/sh",
    TERM: "xterm-256color",
    COLUMNS: String(cols || 80),
    LINES: "24",
    LANG: process.env.LANG || "en_US.UTF-8",
    FORCE_COLOR: "1",
  };

  const proc = Bun.spawn(["sh", "-c", command], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env,
  });

  runningProcesses.set(processId, { proc, aborted: false });

  // Return SSE stream
  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        send({ processId });

        // Stream stdout and stderr concurrently
        const streamOutput = async (stream: ReadableStream<Uint8Array>, type: "stdout" | "stderr") => {
          const reader = stream.getReader();
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              send({ type, data: decoder.decode(value) });
            }
          } catch {
            // Stream closed, ignore
          }
        };

        await Promise.all([
          streamOutput(proc.stdout as ReadableStream<Uint8Array>, "stdout"),
          streamOutput(proc.stderr as ReadableStream<Uint8Array>, "stderr"),
        ]);

        const exitCode = await proc.exited;
        send({ type: "exit", exitCode });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        runningProcesses.delete(processId);
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    }
  );
});

/**
 * Recursively kill a process and all its descendants
 */
function killProcessTree(pid: number): void {
  // Find all child processes
  const result = Bun.spawnSync(["pgrep", "-P", String(pid)]);
  const childPids = new TextDecoder()
    .decode(result.stdout)
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(Number);

  // Recursively kill children first
  for (const childPid of childPids) {
    killProcessTree(childPid);
  }

  // Then kill this process
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // Process may already be dead
  }
}

/**
 * Cancel a running command - kills process and all children
 */
terminalRoutes.post("/:id/cancel", async (c) => {
  const { processId } = await c.req.json<{ processId: string }>();
  const entry = runningProcesses.get(processId);
  if (entry) {
    entry.aborted = true;
    const pid = entry.proc.pid;

    // Kill the entire process tree recursively
    killProcessTree(pid);

    runningProcesses.delete(processId);
    return c.json({ success: true });
  }
  return c.json({ error: "Process not found" }, 404);
});

/**
 * Delete a terminal session
 */
terminalRoutes.delete("/:id", (c) => {
  const id = c.req.param("id");
  const deleted = terminalSessions.delete(id);

  if (!deleted) {
    return c.json({ error: "Terminal not found" }, 404);
  }

  return c.json({ success: true });
});
