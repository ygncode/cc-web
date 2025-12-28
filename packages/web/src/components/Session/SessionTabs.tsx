import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { useSessionStore } from "../../stores/sessionStore";

export function SessionTabs() {
  const { sessions, activeSessionId, setActiveSession, deleteSession, renameSession } =
    useSessionStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

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
