import { useState, useRef, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { useSessionStore } from "../../stores/sessionStore";

export function SessionTabs() {
  const { sessions, activeSessionId, setActiveSession, deleteSession, renameSession } =
    useSessionStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const handleDoubleClick = (sessionId: string, currentName: string) => {
    setEditingId(sessionId);
    setEditValue(currentName);
  };

  const handleSave = () => {
    if (editingId && editValue.trim()) {
      renameSession(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (sessions.length === 0) {
    return null;
  }

  // Mobile: Dropdown selector
  if (isMobile) {
    return (
      <div className="relative">
        {/* Active session button */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-hover transition-colors"
        >
          <img src="/logo.png" alt="logo" className="w-3 h-3" />
          <span className="text-[13px] text-text truncate max-w-[120px]">
            {activeSession?.name || "Select Session"}
          </span>
          {sessions.length > 1 && (
            <span className="text-[11px] text-text-secondary">
              ({sessions.length})
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-text-secondary transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown menu */}
        {dropdownOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setDropdownOpen(false)}
            />
            {/* Dropdown list */}
            <div className="absolute left-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg z-20 py-1 min-w-[200px] max-h-[300px] overflow-y-auto">
              {sessions.map((session) => {
                const isActive = activeSessionId === session.id;
                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      setActiveSession(session.id);
                      setDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                      isActive ? "bg-surface-hover" : "hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <img
                        src="/logo.png"
                        alt="logo"
                        className={`w-3 h-3 ${isActive ? "opacity-100" : "opacity-50"}`}
                      />
                      <span
                        className={`text-[13px] truncate ${
                          isActive ? "text-text font-medium" : "text-text-muted"
                        }`}
                      >
                        {session.name}
                      </span>
                    </div>
                    {sessions.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="p-1 hover:bg-border-light rounded transition-colors ml-2"
                      >
                        <X size={14} className="text-text-secondary" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  // Desktop: Horizontal tabs
  return (
    <div className="flex items-center gap-0.5 overflow-x-auto">
      {sessions.map((session) => {
        const isActive = activeSessionId === session.id;
        const isEditing = editingId === session.id;

        return (
          <div
            key={session.id}
            onClick={() => !isEditing && setActiveSession(session.id)}
            onDoubleClick={() => handleDoubleClick(session.id, session.name)}
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer transition-colors ${
              isActive
                ? "bg-surface-hover"
                : "hover:bg-surface"
            }`}
          >
            <img
              src="/logo.png"
              alt="logo"
              className={`w-3 h-3 ${isActive ? "opacity-100" : "opacity-50"}`}
            />
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="text-[13px] bg-transparent border-none outline-none w-[100px] text-text"
              />
            ) : (
              <span
                className={`text-[13px] truncate max-w-[120px] ${
                  isActive ? "text-text" : "text-text-muted"
                }`}
              >
                {session.name}
              </span>
            )}
            {!isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-border-light rounded transition-all"
              >
                <X size={12} className="text-text-secondary" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
