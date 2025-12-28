import { useEffect } from "react";
import { Header } from "./components/Layout/Header";
import { ChatPanel } from "./components/Chat/ChatPanel";
import { PromptInput } from "./components/Chat/PromptInput";
import { FilePreviewPanel } from "./components/FilePreview/FilePreviewPanel";
import { Sidebar } from "./components/Layout/Sidebar";
import { useSessionStore } from "./stores/sessionStore";
import { useLayoutStore } from "./stores/layoutStore";
import { useFilePreviewStore } from "./stores/filePreviewStore";
import { useChatSession } from "./hooks/useChatSession";

export default function App() {
  const { sessions, activeSessionId, setActiveSession, createSession, fetchSessions, hasFetched } = useSessionStore();
  const { sidebarWidth, setSidebarWidth, theme } = useLayoutStore();
  const activeFileTabId = useFilePreviewStore((state) => state.activeTabId);
  const { messages, isLoading, handleSend, handleAbort } = useChatSession(activeSessionId);

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
  }, [fetchSessions]);

  useEffect(() => {
    // Create initial session only after fetching completes and if none exist
    if (hasFetched && sessions.length === 0) {
      createSession("Untitled");
    }
  }, [hasFetched, sessions.length, createSession]);

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
          {/* Content: File Preview or Chat Messages */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {activeFileTabId ? (
              <FilePreviewPanel />
            ) : (
              <ChatPanel messages={messages} />
            )}
          </div>

          {/* Input Area - Always Visible */}
          <div className="p-4 border-t border-border">
            <PromptInput
              onSend={handleSend}
              onAbort={handleAbort}
              isLoading={isLoading}
              disabled={!activeSessionId}
              sessions={sessions}
              activeSession={sessions.find((s) => s.id === activeSessionId) || null}
              onSessionChange={setActiveSession}
            />
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className="w-px bg-border hover:bg-accent cursor-col-resize flex-shrink-0 transition-colors"
          onMouseDown={handleResizeSidebar}
        />

        {/* Sidebar */}
        <div style={{ width: sidebarWidth }} className="flex-shrink-0">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
