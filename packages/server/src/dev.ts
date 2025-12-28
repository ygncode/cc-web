import { createApp } from "./index.js";

// Dev server - starts the API server standalone for development
const port = 8888;
const host = "localhost";
const cwd = process.env.CC_WEB_CWD || process.cwd();

console.log(`[dev] Creating app with cwd: ${cwd}`);

const app = createApp({ cwd });

const server = Bun.serve({
  port,
  hostname: host,
  fetch: app.fetch,
  idleTimeout: 255, // Max timeout (255 seconds) for long-running SSE streams
});

console.log(`
[dev] API server started!
  → URL: http://${server.hostname}:${server.port}
  → Working directory: ${cwd}
`);
