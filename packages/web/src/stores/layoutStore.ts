import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";

interface LayoutState {
  sidebarWidth: number;
  terminalHeight: number;
  showTerminal: boolean;
  showSidebar: boolean;
  activeTab: "changes" | "files";
  theme: Theme;

  setSidebarWidth: (width: number) => void;
  setTerminalHeight: (height: number) => void;
  toggleTerminal: () => void;
  toggleSidebar: () => void;
  setActiveTab: (tab: "changes" | "files") => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarWidth: 350,
      terminalHeight: 200,
      showTerminal: true,
      showSidebar: true,
      activeTab: "files",
      theme: "light",

      setSidebarWidth: (width: number) => set({ sidebarWidth: width }),
      setTerminalHeight: (height: number) => set({ terminalHeight: height }),
      toggleTerminal: () => set((state) => ({ showTerminal: !state.showTerminal })),
      toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
      setActiveTab: (tab: "changes" | "files") => set({ activeTab: tab }),
      setTheme: (theme: Theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
    }),
    {
      name: "cc-web-layout",
    }
  )
);
