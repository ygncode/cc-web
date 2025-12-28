import { Plus, History } from "lucide-react";
import { useSessionStore } from "../../stores/sessionStore";
import { SessionTabs } from "../Session/SessionTabs";
import { FilePreviewTabs } from "../FilePreview/FilePreviewTabs";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const { createSession } = useSessionStore();

  return (
    <header className="h-11 bg-surface border-b border-border flex items-center px-2">
      {/* Left section - Logo and tabs */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {/* Logo */}
        <div className="flex items-center gap-1.5 px-2 py-1">
          <div className="w-5 h-5 rounded flex items-center justify-center">
            <img src="/logo.png" alt="logo" className="w-4 h-4" />
          </div>
        </div>

        {/* Session Tabs */}
        <SessionTabs />

        {/* New Session Button */}
        <button
          onClick={() => createSession()}
          className="p-1.5 hover:bg-surface-hover rounded transition-colors ml-1"
          title="New Session"
        >
          <Plus size={16} className="text-text-secondary" />
        </button>

        {/* File Preview Tabs */}
        <FilePreviewTabs />
      </div>

      {/* Right section - Theme Toggle and History */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button
          className="p-1.5 hover:bg-surface-hover rounded transition-colors"
          title="History"
        >
          <History size={16} className="text-text-secondary" />
        </button>
      </div>
    </header>
  );
}
