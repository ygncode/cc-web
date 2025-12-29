import { useEffect, useRef, useState } from "react";
import { useLayoutStore } from "../../stores/layoutStore";
import { useTerminalStore } from "../../stores/terminalStore";
import { FileTree } from "../FileTree/FileTree";
import { TerminalPanel } from "../Terminal/TerminalPanel";
import { ChevronDown, ChevronUp, Plus, X, RefreshCw, Menu } from "lucide-react";
import { api } from "../../lib/api";

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { activeTab, setActiveTab, showTerminal, toggleTerminal, terminalHeight, setTerminalHeight } =
    useLayoutStore();
  const { terminals, activeTerminalId, addTerminal, removeTerminal, setActiveTerminal } =
    useTerminalStore();

  // File tree refresh state
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [changesCount, setChangesCount] = useState(0);

  // Mobile menu expanded state
  const [menuExpanded, setMenuExpanded] = useState(false);

  // Manual refresh handler
  const handleRefresh = () => setRefreshTrigger((prev) => prev + 1);

  // Fetch changes count
  useEffect(() => {
    const fetchChangesCount = async () => {
      try {
        const data = await api.getChanges();
        setChangesCount(data.changes.length);
      } catch (error) {
        console.error("Failed to fetch changes count:", error);
      }
    };
    fetchChangesCount();
  }, [refreshTrigger]);

  // Auto-refresh polling
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Track if terminal initialization has been attempted (prevents double-init from StrictMode)
  const initAttemptedRef = useRef(false);

  // Auto-create a terminal on first load
  useEffect(() => {
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    const initTerminal = async () => {
      // Check current state directly from store to avoid stale closure
      const state = useTerminalStore.getState();
      if (state.terminals.length === 0) {
        // Retry a few times in case server isn't ready
        for (let i = 0; i < 3; i++) {
          const result = await state.addTerminal();
          if (result) break;
          // Wait before retry
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    };
    initTerminal();
  }, []);

  const handleResizeTerminal = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = terminalHeight;

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = startHeight - (e.clientY - startY);
      setTerminalHeight(Math.max(100, Math.min(400, newHeight)));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border">
      {/* Tab Bar */}
      <div className="flex items-center border-b border-border">
        <button
          onClick={() => setActiveTab("changes")}
          className={`px-4 py-2.5 text-[13px] font-medium transition-colors relative ${
            activeTab === "changes"
              ? "text-text"
              : "text-text-secondary hover:text-text-muted"
          }`}
        >
          Changes
          <span className="ml-1.5 text-[11px] text-text-secondary">{changesCount}</span>
          {activeTab === "changes" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`px-4 py-2.5 text-[13px] font-medium transition-colors relative ${
            activeTab === "files"
              ? "text-text"
              : "text-text-secondary hover:text-text-muted"
          }`}
        >
          All files
          {activeTab === "files" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
          )}
        </button>

        {/* Right side icons */}
        <div className="ml-auto flex items-center pr-2 gap-1">
          {/* Mobile: hamburger + close only, with dropdown menu */}
          {onClose ? (
            <>
              {/* Hamburger button with dropdown */}
              <div className="relative">
                <button
                  onClick={() => setMenuExpanded(!menuExpanded)}
                  className="p-1 hover:bg-surface-hover rounded transition-colors"
                  title={menuExpanded ? "Hide options" : "Show options"}
                >
                  <Menu size={16} className="text-text-secondary" />
                </button>
                {/* Dropdown menu */}
                {menuExpanded && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuExpanded(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg z-20 py-1 min-w-[140px]">
                      <button
                        onClick={() => {
                          handleRefresh();
                          setMenuExpanded(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-hover transition-colors text-left"
                      >
                        <RefreshCw size={14} className="text-text-secondary" />
                        <span className="text-[13px] text-text">Refresh</span>
                      </button>
                      <button
                        onClick={() => {
                          setAutoRefresh(!autoRefresh);
                          setMenuExpanded(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-hover transition-colors text-left"
                      >
                        <div className={`w-3.5 h-3.5 rounded border ${autoRefresh ? 'bg-accent border-accent' : 'border-text-secondary'}`} />
                        <span className="text-[13px] text-text">Auto-refresh</span>
                      </button>
                      <button
                        onClick={() => setMenuExpanded(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-hover transition-colors text-left"
                      >
                        <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                        <span className="text-[13px] text-text">Sort</span>
                      </button>
                      <button
                        onClick={() => setMenuExpanded(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-hover transition-colors text-left"
                      >
                        <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="text-[13px] text-text">Search</span>
                      </button>
                      <button
                        onClick={() => setMenuExpanded(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-hover transition-colors text-left"
                      >
                        <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        <span className="text-[13px] text-text">Filter</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
              {/* Close button */}
              <button
                onClick={onClose}
                className="p-1 hover:bg-surface-hover rounded transition-colors"
                title="Close sidebar"
              >
                <X size={16} className="text-text-secondary" />
              </button>
            </>
          ) : (
            /* Desktop: show all icons */
            <>
              <button
                onClick={handleRefresh}
                className="p-1 hover:bg-surface-hover rounded transition-colors"
                title="Refresh file tree"
              >
                <RefreshCw size={14} className="text-text-secondary" />
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  autoRefresh
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:bg-surface-hover"
                }`}
                title={autoRefresh ? "Auto-refresh on (5s)" : "Enable auto-refresh"}
              >
                Auto
              </button>
              <button className="p-1 hover:bg-surface-hover rounded transition-colors">
                <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
              </button>
              <button className="p-1 hover:bg-surface-hover rounded transition-colors">
                <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button className="p-1 hover:bg-surface-hover rounded transition-colors">
                <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-auto">
        <FileTree showChangesOnly={activeTab === "changes"} refreshTrigger={refreshTrigger} />
      </div>

      {/* Terminal Section */}
      {showTerminal ? (
        <>
          {/* Resize Handle */}
          <div
            className="h-px bg-border hover:bg-accent cursor-row-resize"
            onMouseDown={handleResizeTerminal}
          />

          {/* Terminal Header - Expanded */}
          <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-background">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTerminal}
                className="flex items-center text-text-secondary hover:text-text-muted transition-colors"
              >
                <ChevronDown size={14} />
              </button>
              {/* Terminal Tabs */}
              <div className="flex items-center gap-1">
                {terminals.map((terminal) => (
                  <div
                    key={terminal.id}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[12px] cursor-pointer transition-colors ${
                      activeTerminalId === terminal.id
                        ? "bg-surface-hover text-text"
                        : "text-text-secondary hover:text-text-muted"
                    }`}
                    onClick={() => setActiveTerminal(terminal.id)}
                  >
                    <span>{terminal.name}</span>
                    {terminals.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTerminal(terminal.id);
                        }}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
                {terminals.length === 0 && (
                  <span className="text-[13px] text-text-secondary">Terminal</span>
                )}
              </div>
            </div>
            <button
              onClick={() => addTerminal()}
              className="p-1 hover:bg-surface-hover rounded transition-colors"
            >
              <Plus size={14} className="text-text-secondary" />
            </button>
          </div>

          {/* Terminal */}
          <div style={{ height: terminalHeight }} className="overflow-hidden">
            {activeTerminalId ? (
              <TerminalPanel
                terminalId={activeTerminalId}
                onExit={() => removeTerminal(activeTerminalId)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                Click + to create a terminal
              </div>
            )}
          </div>
        </>
      ) : (
        /* Terminal Header - Collapsed */
        <div
          className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-background cursor-pointer hover:bg-surface"
          onClick={toggleTerminal}
        >
          <div className="flex items-center gap-2">
            <ChevronUp size={14} className="text-text-secondary" />
            <span className="text-[13px] text-text-secondary">Terminal</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addTerminal();
            }}
            className="p-1 hover:bg-surface-hover rounded transition-colors"
          >
            <Plus size={14} className="text-text-secondary" />
          </button>
        </div>
      )}
    </div>
  );
}
