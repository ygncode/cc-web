import { createApp } from "@cc-web/server";

interface ServerOptions {
  port: number;
  host: string;
  cwd: string;
}

export async function startServer(options: ServerOptions): Promise<void> {
  const { port, host, cwd } = options;

  const app = createApp({ cwd });

  const server = Bun.serve({
    port,
    hostname: host,
    fetch: app.fetch,
    websocket: app.websocket,
  });

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    server.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\nShutting down...");
    server.stop();
    process.exit(0);
  });
}
