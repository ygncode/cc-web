import { Hono } from "hono";
import { readdir, readFile } from "fs/promises";
import path from "path";
import os from "os";
import type { AppContext } from "../index.js";

export const commandRoutes = new Hono<{ Variables: AppContext }>();

interface CustomCommand {
  name: string;
  description: string;
  prompt: string;
  source: "global" | "project";
  namespace?: string;
  argumentHint?: string;
  allowedTools?: string;
}

/**
 * Parse frontmatter from markdown content
 * Returns { frontmatter, content }
 */
function parseFrontmatter(content: string): {
  frontmatter: Record<string, string>;
  content: string;
} {
  const frontmatter: Record<string, string> = {};

  if (!content.startsWith("---")) {
    return { frontmatter, content: content.trim() };
  }

  const endIndex = content.indexOf("---", 3);
  if (endIndex === -1) {
    return { frontmatter, content: content.trim() };
  }

  const frontmatterBlock = content.slice(3, endIndex).trim();
  const mainContent = content.slice(endIndex + 3).trim();

  // Parse YAML-like frontmatter (simple key: value pairs)
  for (const line of frontmatterBlock.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }

  return { frontmatter, content: mainContent };
}

/**
 * Scan a directory for .md command files
 */
async function scanCommandsDir(
  dirPath: string,
  source: "global" | "project"
): Promise<CustomCommand[]> {
  const commands: CustomCommand[] = [];

  try {
    const entries = await readdir(dirPath, { withFileTypes: true, recursive: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }

      const fullPath = path.join(entry.parentPath || dirPath, entry.name);
      const relativePath = path.relative(dirPath, fullPath);

      try {
        const content = await readFile(fullPath, "utf-8");
        const { frontmatter, content: promptContent } = parseFrontmatter(content);

        // Command name is filename without .md extension
        const name = path.basename(entry.name, ".md");

        // Namespace from subdirectory (e.g., frontend/component.md -> namespace: "frontend")
        const dirPart = path.dirname(relativePath);
        const namespace = dirPart !== "." ? dirPart : undefined;

        commands.push({
          name,
          description: frontmatter["description"] || promptContent.slice(0, 50) + "...",
          prompt: promptContent,
          source,
          namespace,
          argumentHint: frontmatter["argument-hint"],
          allowedTools: frontmatter["allowed-tools"],
        });
      } catch (err) {
        console.error(`Error reading command file ${fullPath}:`, err);
      }
    }
  } catch (err) {
    // Directory doesn't exist or can't be read - that's ok
  }

  return commands;
}

/**
 * GET /api/commands
 * Returns all custom commands from global and project directories
 */
commandRoutes.get("/", async (c) => {
  const cwd = c.get("cwd");

  // Global commands: ~/.claude/commands/
  const globalDir = path.join(os.homedir(), ".claude", "commands");
  const globalCommands = await scanCommandsDir(globalDir, "global");

  // Project commands: .claude/commands/ (relative to cwd)
  const projectDir = path.join(cwd, ".claude", "commands");
  const projectCommands = await scanCommandsDir(projectDir, "project");

  // Project commands take precedence over global commands with same name
  const commandMap = new Map<string, CustomCommand>();

  // Add global commands first
  for (const cmd of globalCommands) {
    commandMap.set(cmd.name, cmd);
  }

  // Override with project commands
  for (const cmd of projectCommands) {
    commandMap.set(cmd.name, cmd);
  }

  const commands = Array.from(commandMap.values());

  return c.json({
    commands,
    globalDir,
    projectDir,
  });
});
