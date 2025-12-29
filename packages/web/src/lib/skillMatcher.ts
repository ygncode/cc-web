/**
 * Skill matching utilities.
 * Matches user prompts to skill descriptions using keyword-based matching.
 */

import type { Skill } from "../stores/skillStore";

/**
 * Common words to skip when matching (stopwords).
 */
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
  "be", "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "shall", "can", "this", "that", "these",
  "those", "i", "you", "he", "she", "it", "we", "they", "what", "which",
  "who", "whom", "when", "where", "why", "how", "all", "each", "every",
  "both", "few", "more", "most", "other", "some", "such", "no", "not",
  "only", "own", "same", "so", "than", "too", "very", "just", "use",
  "using", "used", "want", "need", "help", "please", "file", "files",
  "code", "about", "your", "my", "me", "ask", "asking",
]);

/**
 * Extract meaningful keywords from text.
 */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ") // Remove punctuation except hyphens
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

/**
 * Calculate a match score between prompt and skill.
 * Returns a score from 0 to 100.
 */
function calculateMatchScore(prompt: string, skill: Skill): number {
  const promptKeywords = extractKeywords(prompt);
  const descKeywords = extractKeywords(skill.description);

  if (promptKeywords.length === 0 || descKeywords.length === 0) {
    return 0;
  }

  // Count matching keywords
  let matches = 0;
  for (const promptWord of promptKeywords) {
    for (const descWord of descKeywords) {
      // Exact match
      if (promptWord === descWord) {
        matches += 2;
      }
      // Partial match (one contains the other)
      else if (promptWord.includes(descWord) || descWord.includes(promptWord)) {
        matches += 1;
      }
    }
  }

  // Bonus for matching the skill name
  const skillNameWords = skill.name.toLowerCase().split("-");
  for (const nameWord of skillNameWords) {
    if (promptKeywords.some((pw) => pw.includes(nameWord) || nameWord.includes(pw))) {
      matches += 3;
    }
  }

  // Normalize score: require meaningful overlap
  // Score is based on percentage of description keywords matched
  const maxPossibleScore = descKeywords.length * 2 + skillNameWords.length * 3;
  const normalizedScore = Math.min(100, (matches / maxPossibleScore) * 100);

  return normalizedScore;
}

/**
 * Find the best matching skill for a given prompt.
 * Returns null if no skill matches above the threshold.
 */
export function findMatchingSkill(prompt: string, skills: Skill[]): Skill | null {
  if (!prompt.trim() || skills.length === 0) {
    return null;
  }

  const MATCH_THRESHOLD = 25; // Minimum score to consider a match

  let bestSkill: Skill | null = null;
  let bestScore = 0;

  for (const skill of skills) {
    const score = calculateMatchScore(prompt, skill);

    if (score > bestScore && score >= MATCH_THRESHOLD) {
      bestScore = score;
      bestSkill = skill;
    }
  }

  return bestSkill;
}

/**
 * Get all skills that match above a threshold, sorted by score.
 * Useful for debugging or showing multiple options.
 */
export function findAllMatchingSkills(
  prompt: string,
  skills: Skill[],
  threshold: number = 15
): Array<{ skill: Skill; score: number }> {
  if (!prompt.trim() || skills.length === 0) {
    return [];
  }

  const matches: Array<{ skill: Skill; score: number }> = [];

  for (const skill of skills) {
    const score = calculateMatchScore(prompt, skill);
    if (score >= threshold) {
      matches.push({ skill, score });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return matches;
}
