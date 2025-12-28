import path from "path";

/**
 * Validates that a requested path is within the allowed base directory.
 * Prevents path traversal attacks.
 */
export function isPathAllowed(requestedPath: string, basePath: string): boolean {
  // Resolve the full path
  const resolved = path.resolve(basePath, requestedPath);
  const normalizedBase = path.resolve(basePath);

  // Check if the resolved path starts with the base path
  return resolved.startsWith(normalizedBase + path.sep) || resolved === normalizedBase;
}

/**
 * Extracts file path from tool input based on tool type
 */
export function getPathFromToolInput(
  toolName: string,
  input: Record<string, unknown>
): string | null {
  switch (toolName) {
    case "Read":
    case "Write":
    case "Edit":
      return (input.file_path as string) || null;
    case "Glob":
    case "Grep":
      return (input.path as string) || null;
    case "Bash":
      // For Bash, we can't easily extract paths from commands
      // The command will run in the restricted cwd anyway
      return null;
    default:
      return null;
  }
}

/**
 * List of tools that are allowed for the agent
 */
export const ALLOWED_TOOLS = [
  "Read",
  "Write",
  "Edit",
  "Bash",
  "Glob",
  "Grep",
  "Task",
  "TodoWrite",
] as const;

/**
 * Creates a canUseTool callback that restricts file operations to the base directory
 */
export function createSandboxedToolChecker(basePath: string) {
  return async (
    toolName: string,
    input: Record<string, unknown>
  ): Promise<{ behavior: "allow" | "deny"; message?: string; updatedInput?: Record<string, unknown> }> => {
    // Check if tool is in allowed list
    if (!ALLOWED_TOOLS.includes(toolName as typeof ALLOWED_TOOLS[number])) {
      return {
        behavior: "deny",
        message: `Tool "${toolName}" is not allowed`,
      };
    }

    // For file-related tools, check path
    const filePath = getPathFromToolInput(toolName, input);
    if (filePath && !isPathAllowed(filePath, basePath)) {
      return {
        behavior: "deny",
        message: `Access denied: "${filePath}" is outside the allowed directory`,
      };
    }

    return {
      behavior: "allow",
      updatedInput: input,
    };
  };
}
