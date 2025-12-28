import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { agentRoutes } from "./routes/agent.js";
import { sessionRoutes } from "./routes/session.js";
import { fileRoutes } from "./routes/files.js";
import { terminalRoutes } from "./routes/terminal.js";
import type { ServerWebSocket } from "bun";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory where this file is located
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Static files are in packages/web/dist relative to packages/server/src
const staticRoot = path.resolve(__dirname, "../../web/dist");

export interface AppContext {
  cwd: string;
}

interface CreateAppOptions {
  cwd: string;
}

export function createApp(options: CreateAppOptions) {
  const { cwd } = options;

  const app = new Hono<{ Variables: AppContext }>();

  // Middleware
  app.use("*", logger());
  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Set cwd in context
  app.use("*", async (c, next) => {
    c.set("cwd", cwd);
    await next();
  });

  // API Routes
  app.route("/api/agent", agentRoutes);
  app.route("/api/sessions", sessionRoutes);
  app.route("/api/files", fileRoutes);
  app.route("/api/terminal", terminalRoutes);

  // Health check
  app.get("/api/health", (c) => {
    return c.json({ status: "ok", cwd, staticRoot });
  });

  // Serve static files from web package (production)
  app.use(
    "/*",
    serveStatic({
      root: staticRoot,
    })
  );

  // Fallback to index.html for SPA routing
  app.get("*", serveStatic({ path: path.join(staticRoot, "index.html") }));

  // WebSocket handler for terminal
  const websocket = {
    message(ws: ServerWebSocket<{ terminalId: string }>, message: string | Buffer) {
      // Handle terminal input - will be implemented in terminal service
      const { terminalId } = ws.data;
      // terminalService.write(terminalId, message.toString());
    },
    open(ws: ServerWebSocket<{ terminalId: string }>) {
      console.log("Terminal WebSocket connected:", ws.data.terminalId);
    },
    close(ws: ServerWebSocket<{ terminalId: string }>) {
      console.log("Terminal WebSocket closed:", ws.data.terminalId);
      // terminalService.destroy(ws.data.terminalId);
    },
  };

  return { fetch: app.fetch, websocket };
}

export { agentRoutes, sessionRoutes, fileRoutes, terminalRoutes };
