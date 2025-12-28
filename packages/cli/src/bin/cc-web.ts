#!/usr/bin/env bun
import { Command } from "commander";
import { startServer } from "../index.js";
import path from "path";

// Capture the original working directory before any changes
// CC_WEB_CWD is set by the root package.json start script
// INIT_CWD is set by npm/yarn, PWD is the shell's working directory
const originalCwd =
  process.env.CC_WEB_CWD ||
  process.env.INIT_CWD ||
  process.env.PWD ||
  process.cwd();

const program = new Command();

program
  .name("cc-web")
  .description("Web UI for Claude Code Agent SDK")
  .version("0.1.0");

program
  .command("start")
  .description("Start the cc-web server")
  .option("-p, --port <port>", "Port to listen on", "8888")
  .option("-H, --host <host>", "Host to bind to", "localhost")
  .option("-d, --dir <directory>", "Working directory", originalCwd)
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    const host = options.host;
    const cwd = path.resolve(options.dir);

    console.log(`
╭─────────────────────────────────────────╮
│                                         │
│   cc-web - Claude Code Web UI           │
│                                         │
╰─────────────────────────────────────────╯

Starting server...
  → URL: http://${host}:${port}
  → Working directory: ${cwd}
  → Agent restricted to this directory

Press Ctrl+C to stop
`);

    await startServer({ port, host, cwd });
  });

program.parse();
