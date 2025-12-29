import { Hono } from "hono";
import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import type { AppContext } from "../index.js";

export const skillRoutes = new Hono<{ Variables: AppContext }>();

interface Skill {
  name: string;
  description: string;
  instructions: string;
  source: "global" | "project";
  basePath: string;
  supportingFiles: string[];
  scripts: string[];
  allowedTools?: string[];
  model?: string;
}

/**
 * Parse YAML frontmatter from markdown content.
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
 * Get all .md files in a directory (excluding SKILL.md)
 */
async function getSupportingFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "SKILL.md") {
        files.push(entry.name);
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }
  return files;
}

/**
 * Get all scripts in the scripts/ subdirectory
 */
async function getScripts(dirPath: string): Promise<string[]> {
  const scripts: string[] = [];
  const scriptsDir = path.join(dirPath, "scripts");
  try {
    const entries = await readdir(scriptsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        scripts.push(`scripts/${entry.name}`);
      }
    }
  } catch {
    // scripts/ directory doesn't exist
  }
  return scripts;
}

/**
 * Scan a directory for skill subdirectories containing SKILL.md
 */
async function scanSkillsDir(
  dirPath: string,
  source: "global" | "project"
): Promise<Skill[]> {
  const skills: Skill[] = [];

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillDir = path.join(dirPath, entry.name);
      const skillMdPath = path.join(skillDir, "SKILL.md");

      try {
        // Check if SKILL.md exists
        await stat(skillMdPath);

        const content = await readFile(skillMdPath, "utf-8");
        const { frontmatter, content: instructions } = parseFrontmatter(content);

        // Get supporting files and scripts
        const supportingFiles = await getSupportingFiles(skillDir);
        const scripts = await getScripts(skillDir);

        // Parse allowed-tools as array
        let allowedTools: string[] | undefined;
        if (frontmatter["allowed-tools"]) {
          allowedTools = frontmatter["allowed-tools"]
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        }

        skills.push({
          name: frontmatter["name"] || entry.name,
          description: frontmatter["description"] || instructions.slice(0, 100) + "...",
          instructions,
          source,
          basePath: skillDir,
          supportingFiles,
          scripts,
          allowedTools,
          model: frontmatter["model"],
        });
      } catch {
        // SKILL.md doesn't exist or can't be read - skip this directory
      }
    }
  } catch {
    // Skills directory doesn't exist or can't be read
  }

  return skills;
}

/**
 * GET /api/skills
 * Returns all skills from global and project directories
 */
skillRoutes.get("/", async (c) => {
  const cwd = c.get("cwd");

  // Global skills: ~/.claude/skills/
  const globalDir = path.join(os.homedir(), ".claude", "skills");
  const globalSkills = await scanSkillsDir(globalDir, "global");

  // Project skills: .claude/skills/ (relative to cwd)
  const projectDir = path.join(cwd, ".claude", "skills");
  const projectSkills = await scanSkillsDir(projectDir, "project");

  // Project skills take precedence over global skills with same name
  const skillMap = new Map<string, Skill>();

  // Add global skills first
  for (const skill of globalSkills) {
    skillMap.set(skill.name, skill);
  }

  // Override with project skills
  for (const skill of projectSkills) {
    skillMap.set(skill.name, skill);
  }

  const skills = Array.from(skillMap.values());

  return c.json({
    skills,
    globalDir,
    projectDir,
  });
});

/**
 * GET /api/skills/:skillName/file
 * Returns the content of a supporting file within a skill directory
 * Query param: path (e.g., "reference.md" or "examples.md")
 */
skillRoutes.get("/:skillName/file", async (c) => {
  const cwd = c.get("cwd");
  const skillName = c.req.param("skillName");
  const filePath = c.req.query("path");

  if (!filePath) {
    return c.json({ error: "Missing 'path' query parameter" }, 400);
  }

  // Security: Prevent path traversal
  if (filePath.includes("..") || path.isAbsolute(filePath)) {
    return c.json({ error: "Invalid file path" }, 400);
  }

  // Try project skills first, then global
  const projectDir = path.join(cwd, ".claude", "skills", skillName);
  const globalDir = path.join(os.homedir(), ".claude", "skills", skillName);

  for (const baseDir of [projectDir, globalDir]) {
    const fullPath = path.join(baseDir, filePath);

    // Ensure the resolved path is still within the skill directory
    if (!fullPath.startsWith(baseDir)) {
      continue;
    }

    try {
      const content = await readFile(fullPath, "utf-8");
      return c.text(content);
    } catch {
      // File doesn't exist in this directory, try next
    }
  }

  return c.json({ error: "File not found" }, 404);
});

/**
 * POST /api/skills/:skillName/script
 * Executes a script within a skill directory and returns its output
 * Body: { path: "scripts/validate.py", args: "input.pdf" }
 */
skillRoutes.post("/:skillName/script", async (c) => {
  const cwd = c.get("cwd");
  const skillName = c.req.param("skillName");
  const body = await c.req.json<{ path: string; args?: string }>();

  if (!body.path) {
    return c.json({ error: "Missing 'path' in request body" }, 400);
  }

  const scriptPath = body.path;

  // Security: Prevent path traversal
  if (scriptPath.includes("..") || path.isAbsolute(scriptPath)) {
    return c.json({ error: "Invalid script path" }, 400);
  }

  // Try project skills first, then global
  const projectDir = path.join(cwd, ".claude", "skills", skillName);
  const globalDir = path.join(os.homedir(), ".claude", "skills", skillName);

  for (const baseDir of [projectDir, globalDir]) {
    const fullPath = path.join(baseDir, scriptPath);

    // Ensure the resolved path is still within the skill directory
    if (!fullPath.startsWith(baseDir)) {
      continue;
    }

    try {
      await stat(fullPath);

      // Determine how to execute based on extension
      const ext = path.extname(scriptPath).toLowerCase();
      let command: string;
      let cmdArgs: string[];

      if (ext === ".py") {
        command = "python3";
        cmdArgs = [fullPath];
      } else if (ext === ".sh" || ext === ".bash") {
        command = "bash";
        cmdArgs = [fullPath];
      } else if (ext === ".js" || ext === ".mjs") {
        command = "node";
        cmdArgs = [fullPath];
      } else if (ext === ".ts") {
        command = "bun";
        cmdArgs = ["run", fullPath];
      } else {
        // Try to execute directly (assumes executable)
        command = fullPath;
        cmdArgs = [];
      }

      // Add user-provided arguments
      if (body.args) {
        cmdArgs.push(...body.args.split(" ").filter(Boolean));
      }

      // Execute the script
      const output = await new Promise<string>((resolve, reject) => {
        const proc = spawn(command, cmdArgs, {
          cwd: baseDir,
          timeout: 30000, // 30 second timeout
        });

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        proc.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        proc.on("close", (code) => {
          if (code === 0) {
            resolve(stdout);
          } else {
            reject(new Error(stderr || `Script exited with code ${code}`));
          }
        });

        proc.on("error", (err) => {
          reject(err);
        });
      });

      return c.text(output);
    } catch (err) {
      if (err instanceof Error && err.message.includes("ENOENT")) {
        // Script doesn't exist in this directory, try next
        continue;
      }
      // Script execution failed
      return c.json(
        { error: err instanceof Error ? err.message : "Script execution failed" },
        500
      );
    }
  }

  return c.json({ error: "Script not found" }, 404);
});
