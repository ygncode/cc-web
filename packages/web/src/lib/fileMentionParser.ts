/**
 * File mention detection utilities.
 * Detects @mentions anywhere in input for file autocomplete.
 */

export interface FileMentionMatch {
  query: string;      // Text after @, e.g., "src/comp"
  startIndex: number; // Position of @ in input
  endIndex: number;   // Current cursor position
}

/**
 * Detect a file mention at the current cursor position.
 * Returns null if no valid mention is found.
 *
 * Rules:
 * - @ must be preceded by whitespace or be at start of input
 * - Query is text between @ and cursor (no whitespace allowed)
 * - Ignores email patterns like "user@example.com"
 *
 * @example
 * detectFileMention("Look at @src/co", 15)
 *   → { query: "src/co", startIndex: 8, endIndex: 15 }
 *
 * detectFileMention("email@example.com", 17)
 *   → null (email pattern)
 *
 * detectFileMention("See @file.ts and then", 12)
 *   → null (mention completed, cursor after space)
 */
export function detectFileMention(
  input: string,
  cursorPosition: number
): FileMentionMatch | null {
  if (cursorPosition <= 0 || cursorPosition > input.length) {
    return null;
  }

  // Get text from start to cursor
  const beforeCursor = input.slice(0, cursorPosition);

  // Search backwards for @ symbol
  let atIndex = -1;
  for (let i = beforeCursor.length - 1; i >= 0; i--) {
    const char = beforeCursor[i];

    // If we hit whitespace before finding @, no valid mention
    if (/\s/.test(char)) {
      break;
    }

    if (char === "@") {
      atIndex = i;
      break;
    }
  }

  if (atIndex === -1) {
    return null;
  }

  // Check that @ is at start or preceded by whitespace
  if (atIndex > 0) {
    const charBefore = input[atIndex - 1];
    if (!/\s/.test(charBefore)) {
      // @ is part of a word (like email), not a mention
      return null;
    }
  }

  // Extract query (text after @)
  const query = beforeCursor.slice(atIndex + 1);

  // If query contains whitespace, the mention is complete
  if (/\s/.test(query)) {
    return null;
  }

  return {
    query,
    startIndex: atIndex,
    endIndex: cursorPosition,
  };
}

/**
 * Check if a string looks like an email address.
 * Used to avoid triggering on email patterns.
 */
export function isEmailPattern(text: string): boolean {
  // Simple check: has @ with non-whitespace on both sides and contains a dot after @
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(text);
}
