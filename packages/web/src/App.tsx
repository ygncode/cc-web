import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import { Header } from "./components/Layout/Header";
import { ChatPanel } from "./components/Chat/ChatPanel";
import { PromptInput, type PromptInputRef } from "./components/Chat/PromptInput";
import { FilePreviewPanel } from "./components/FilePreview/FilePreviewPanel";
import { Sidebar } from "./components/Layout/Sidebar";
import { NoteEditor, type NoteEditorRef } from "./components/Note/NoteEditor";
import { useSessionStore } from "./stores/sessionStore";
import { useNoteStore } from "./stores/noteStore";
import { useLayoutStore } from "./stores/layoutStore";
import { useFilePreviewStore } from "./stores/filePreviewStore";
import { useCommandStore } from "./stores/commandStore";
import { useSkillStore } from "./stores/skillStore";
import { useChatSession } from "./hooks/useChatSession";

export default function App() {
  const { sessions, activeSessionId, setActiveSession, createSession, fetchSessions, hasFetched } = useSessionStore();
  const isNoteActive = useNoteStore((state) => state.isActive);
  const noteEditorRef = useRef<NoteEditorRef>(null);
  const promptInputRef = useRef<PromptInputRef>(null);
  const fetchCustomCommands = useCommandStore((state) => state.fetchCustomCommands);
  const fetchSkills = useSkillStore((state) => state.fetchSkills);
  const { sidebarWidth, setSidebarWidth, showSidebar, toggleSidebar, theme } = useLayoutStore();
  const activeFileTabId = useFilePreviewStore((state) => state.activeTabId);
  const closeTab = useFilePreviewStore((state) => state.closeTab);
  const fileTabs = useFilePreviewStore((state) => state.tabs);
  const activeFileTab = fileTabs.find(t => t.id === activeFileTabId);
  const { messages, isLoading, handleSend, handleAbort } = useChatSession(activeSessionId);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile view and auto-hide sidebar on mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-hide sidebar when switching to mobile view
      if (mobile && showSidebar) {
        toggleSidebar();
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply theme class to HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    fetchSessions();
    fetchCustomCommands();
    fetchSkills();
  }, [fetchSessions, fetchCustomCommands, fetchSkills]);

  useEffect(() => {
    // Create initial session only after fetching completes and if none exist
    if (hasFetched && sessions.length === 0) {
      createSession("Untitled");
    }
  }, [hasFetched, sessions.length, createSession]);

  // Keyboard shortcut: Cmd+L / Ctrl+L to focus input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "l") {
        e.preventDefault();
        if (isNoteActive) {
          noteEditorRef.current?.focus();
        } else {
          promptInputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isNoteActive]);

  const handleResizeSidebar = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth - (e.clientX - startX);
      setSidebarWidth(Math.max(250, Math.min(500, newWidth)));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Content: Note Editor, File Preview, or Chat Messages */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {isNoteActive ? (
              <NoteEditor ref={noteEditorRef} />
            ) : activeFileTabId ? (
              <FilePreviewPanel />
            ) : (
              <ChatPanel messages={messages} />
            )}
          </div>

          {/* Input Area - Hidden when Note is active */}
          {!isNoteActive && (
            <div className="p-4 border-t border-border">
              <PromptInput
                ref={promptInputRef}
                onSend={handleSend}
                onAbort={handleAbort}
                isLoading={isLoading}
                disabled={!activeSessionId}
                sessions={sessions}
                activeSession={sessions.find((s) => s.id === activeSessionId) || null}
                onSessionChange={setActiveSession}
              />
            </div>
          )}
        </div>

        {/* Resize Handle - Only show when sidebar is visible on desktop */}
        {showSidebar && !isMobile && (
          <div
            className="w-px bg-border hover:bg-accent cursor-col-resize flex-shrink-0 transition-colors"
            onMouseDown={handleResizeSidebar}
          />
        )}

        {/* Sidebar - Desktop: side panel, Mobile: overlay */}
        {showSidebar && !isMobile && (
          <div style={{ width: sidebarWidth }} className="flex-shrink-0">
            <Sidebar />
          </div>
        )}

        {/* Mobile Sidebar Overlay */}
        {showSidebar && isMobile && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={toggleSidebar}
            />
            {/* Sidebar Panel - Full Screen */}
            <div className="fixed inset-0 w-full bg-background z-50">
              <Sidebar onClose={toggleSidebar} />
            </div>
          </>
        )}

        {/* Mobile File Preview Overlay - on top of sidebar */}
        {isMobile && showSidebar && activeFileTabId && (
          <div className="fixed inset-0 w-full bg-background z-[60] flex flex-col">
            {/* Header with close button */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-[13px] text-text-secondary truncate flex-1">
                {activeFileTab?.filename || 'File'}
              </span>
              <button
                onClick={() => closeTab(activeFileTabId)}
                className="p-1.5 hover:bg-surface-hover rounded transition-colors ml-2"
                title="Close file"
              >
                <X size={18} className="text-text-secondary" />
              </button>
            </div>
            {/* File content */}
            <div className="flex-1 overflow-hidden">
              <FilePreviewPanel />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
