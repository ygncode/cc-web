import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../lib/api";

export interface FileItem {
  name: string;
  path: string;
  type: "file" | "directory";
}

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
}

interface FileStoreState {
  // Flattened file list for search
  files: FileItem[];
  isLoading: boolean;
  lastFetched: number | null;

  // Recent files (persisted)
  recentFiles: string[];

  // Actions
  fetchFiles: () => Promise<void>;
  searchFiles: (query: string) => FileItem[];
  addRecentFile: (path: string) => void;
  getRecentFileItems: () => FileItem[];
}

const MAX_RECENT_FILES = 15;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Flatten a file tree into a list of files (excluding directories).
 */
function flattenTree(tree: TreeNode[], result: FileItem[] = []): FileItem[] {
  for (const node of tree) {
    if (node.type === "file") {
      result.push({
        name: node.name,
        path: node.path,
        type: node.type,
      });
    }
    if (node.children) {
      flattenTree(node.children, result);
    }
  }
  return result;
}

/**
 * Simple fuzzy match - checks if query chars appear in order in target.
 */
function fuzzyMatch(query: string, target: string): boolean {
  let queryIndex = 0;
  for (let i = 0; i < target.length && queryIndex < query.length; i++) {
    if (target[i] === query[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === query.length;
}

export const useFileStore = create<FileStoreState>()(
  persist(
    (set, get) => ({
      files: [],
      isLoading: false,
      lastFetched: null,
      recentFiles: [],

      fetchFiles: async () => {
        const { lastFetched, isLoading } = get();

        // Skip if already loading or cache is fresh
        if (isLoading) return;
        if (lastFetched && Date.now() - lastFetched < CACHE_DURATION) return;

        set({ isLoading: true });

        try {
          const response = await api.getFiles(10); // depth 10 for deep search
          const files = flattenTree(response.tree);
          set({ files, lastFetched: Date.now() });
        } catch (error) {
          console.error("Failed to fetch files:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      searchFiles: (query: string) => {
        const { files, recentFiles } = get();
        const lowerQuery = query.toLowerCase();

        if (!query) {
          // Return recent files if no query
          return get().getRecentFileItems().slice(0, 10);
        }

        // Score and filter files
        const scored = files
          .map((file) => {
            const lowerPath = file.path.toLowerCase();
            const lowerName = file.name.toLowerCase();

            let score = 0;

            // Exact filename match
            if (lowerName === lowerQuery) {
              score = 100;
            }
            // Filename starts with query
            else if (lowerName.startsWith(lowerQuery)) {
              score = 80;
            }
            // Filename contains query
            else if (lowerName.includes(lowerQuery)) {
              score = 70;
            }
            // Path contains query
            else if (lowerPath.includes(lowerQuery)) {
              score = 60;
            }
            // Fuzzy match on path
            else if (fuzzyMatch(lowerQuery, lowerPath)) {
              score = 40;
            }

            if (score === 0) return null;

            // Boost score for recent files
            if (recentFiles.includes(file.path)) {
              score += 20;
            }

            return { file, score };
          })
          .filter((item): item is { file: FileItem; score: number } => item !== null);

        // Sort by score (highest first)
        scored.sort((a, b) => b.score - a.score);

        // Return top 20 results
        return scored.slice(0, 20).map((item) => item.file);
      },

      addRecentFile: (path: string) => {
        set((state) => {
          // Remove if already exists, then add to front
          const filtered = state.recentFiles.filter((p) => p !== path);
          const newRecent = [path, ...filtered].slice(0, MAX_RECENT_FILES);
          return { recentFiles: newRecent };
        });
      },

      getRecentFileItems: () => {
        const { files, recentFiles } = get();
        const fileMap = new Map(files.map((f) => [f.path, f]));

        return recentFiles
          .map((path) => fileMap.get(path))
          .filter((f): f is FileItem => f !== undefined);
      },
    }),
    {
      name: "cc-web-files",
      partialize: (state) => ({ recentFiles: state.recentFiles }),
    }
  )
);
