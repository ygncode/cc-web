import { create } from "zustand";
import { api } from "../lib/api";

export interface FileTab {
  id: string;
  path: string;
  filename: string;
  extension: string;
  content: string | null;
  isLoading: boolean;
  error: string | null;
}

interface FilePreviewState {
  tabs: FileTab[];
  activeTabId: string | null;

  openFile: (path: string) => Promise<void>;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  closeAllTabs: () => void;
}

export const useFilePreviewStore = create<FilePreviewState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openFile: async (path: string) => {
    const state = get();

    // Check if file is already open
    const existingTab = state.tabs.find((tab) => tab.path === path);
    if (existingTab) {
      set({ activeTabId: existingTab.id });
      return;
    }

    // Extract filename and extension
    const filename = path.split("/").pop() || path;
    const extension = filename.includes(".")
      ? filename.split(".").pop()?.toLowerCase() || ""
      : "";

    // Create new tab with loading state
    const tabId = `file-${Date.now()}`;
    const newTab: FileTab = {
      id: tabId,
      path,
      filename,
      extension,
      content: null,
      isLoading: true,
      error: null,
    };

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: tabId,
    }));

    // Fetch file content
    try {
      const data = await api.getFileContent(path);
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === tabId
            ? { ...tab, content: data.content, isLoading: false }
            : tab
        ),
      }));
    } catch (error) {
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === tabId
            ? {
                ...tab,
                error: error instanceof Error ? error.message : "Failed to load file",
                isLoading: false,
              }
            : tab
        ),
      }));
    }
  },

  closeTab: (tabId: string) => {
    const state = get();
    const newTabs = state.tabs.filter((t) => t.id !== tabId);
    let newActiveId = state.activeTabId;

    // If closing active tab, switch to another tab or null
    if (state.activeTabId === tabId) {
      const closedIndex = state.tabs.findIndex((t) => t.id === tabId);
      if (newTabs.length > 0) {
        // Prefer the tab to the left, or the first tab
        newActiveId = newTabs[Math.max(0, closedIndex - 1)]?.id || newTabs[0].id;
      } else {
        newActiveId = null;
      }
    }

    set({
      tabs: newTabs,
      activeTabId: newActiveId,
    });
  },

  setActiveTab: (tabId: string) => {
    set({ activeTabId: tabId });
  },

  closeAllTabs: () => {
    set({ tabs: [], activeTabId: null });
  },
}));
