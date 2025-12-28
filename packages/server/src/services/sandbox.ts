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

