import { Hono } from "hono";
import { mkdir, readdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";
import { isPathAllowed } from "../services/sandbox.js";
import type { AppContext } from "../index.js";
import type { Attachment } from "../services/session.js";

export const fileRoutes = new Hono<{ Variables: AppContext }>();

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

/**
 * Recursively build file tree
 */
async function buildFileTree(
  dirPath: string,
  basePath: string,
  maxDepth: number = 5,
  currentDepth: number = 0
): Promise<FileNode[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      // Skip hidden files and common ignore patterns
      if (
        entry.name.startsWith(".") ||
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === "build" ||
        entry.name === "__pycache__"
      ) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      if (entry.isDirectory()) {
        const children = await buildFileTree(
          fullPath,
          basePath,
          maxDepth,
          currentDepth + 1
        );
        nodes.push({
          name: entry.name,
          path: relativePath,
          type: "directory",
          children,
        });
      } else {
        nodes.push({
          name: entry.name,
          path: relativePath,
          type: "file",
        });
      }
    }

    // Sort: directories first, then alphabetically
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    return [];
  }
}

/**
 * Get file tree for the working directory
 */
fileRoutes.get("/", async (c) => {
  const cwd = c.get("cwd");
  const depth = parseInt(c.req.query("depth") || "5", 10);

  const tree = await buildFileTree(cwd, cwd, depth);
  return c.json({ tree, cwd });
});

/**
 * Get file content
 */
fileRoutes.get("/content", async (c) => {
  const cwd = c.get("cwd");
  const filePath = c.req.query("path");

  if (!filePath) {
    return c.json({ error: "Path is required" }, 400);
  }

  // Security check
  const fullPath = path.resolve(cwd, filePath);
  if (!isPathAllowed(fullPath, cwd)) {
    return c.json({ error: "Access denied" }, 403);
  }

  try {
    const stats = await stat(fullPath);

    // Don't read very large files
    if (stats.size > 1024 * 1024) {
      return c.json({ error: "File too large (> 1MB)" }, 400);
    }

    const content = await readFile(fullPath, "utf-8");
    const extension = path.extname(filePath).slice(1);

    return c.json({
      content,
      path: filePath,
      extension,
      size: stats.size,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return c.json({ error: "File not found" }, 404);
    }
    return c.json({ error: "Failed to read file" }, 500);
  }
});

/**
 * Get git status (changed files)
 */
fileRoutes.get("/changes", async (c) => {
  const cwd = c.get("cwd");

  try {
    const proc = Bun.spawn(["git", "status", "--porcelain"], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      return c.json({ changes: [], isGitRepo: false });
    }

    const changes = output
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const status = line.slice(0, 2).trim();
        const filePath = line.slice(3);
        return {
          status,
          path: filePath,
          type: status === "D" ? "deleted" : status === "A" ? "added" : "modified",
        };
      });

    return c.json({ changes, isGitRepo: true });
  } catch (error) {
    return c.json({ changes: [], isGitRepo: false });
  }
});

/**
 * Upload attachments to .context/attachments folder
 */
fileRoutes.post("/upload", async (c) => {
  const cwd = c.get("cwd");
  const attachmentsDir = path.join(cwd, ".context", "attachments");

  // Ensure directory exists
  await mkdir(attachmentsDir, { recursive: true });

  const formData = await c.req.formData();
  const files = formData.getAll("files");
  const attachments: Attachment[] = [];

  for (const file of files) {
    if (!(file instanceof File)) continue;

    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storedName = `${timestamp}-${id}-${safeName}`;
    const storedPath = path.join(".context", "attachments", storedName);
    const fullPath = path.join(cwd, storedPath);

    const buffer = await file.arrayBuffer();
    await writeFile(fullPath, Buffer.from(buffer));

    attachments.push({
      id,
      originalName: file.name,
      storedPath,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    });
  }

  return c.json({ attachments });
});
