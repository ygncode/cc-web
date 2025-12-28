import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Square, Paperclip, FileText, Check, ChevronUp, ChevronDown, X } from "lucide-react";

// Available Claude Code models
const CLAUDE_MODELS = [
  { id: "opus-4.5", name: "Opus 4.5" },
  { id: "sonnet-4.5", name: "Sonnet 4.5" },
  { id: "haiku-4.5", name: "Haiku 4.5" },
] as const;

type ModelId = typeof CLAUDE_MODELS[number]["id"];

// Think level labels
const THINK_LEVELS = [
  null,        // 0: Off
  "Think",     // 1: Think
  "Megathink", // 2: Megathink
  "Ultrathink" // 3: Ultrathink
] as const;

type ThinkLevel = 0 | 1 | 2 | 3;

interface Session {
  id: string;
  name: string;
}

interface PromptInputProps {
  onSend: (prompt: string, model: string, files: File[]) => void;
  onAbort: () => void;
  isLoading: boolean;
  disabled?: boolean;
  sessions?: Session[];
  activeSession?: Session | null;
  onSessionChange?: (sessionId: string) => void;
}

// Hook for detecting clicks outside an element
function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

// Custom logo component
function ClaudeLogo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="Logo"
      width={14}
      height={14}
      className={className}
    />
  );
}

// Brain icon SVG component
function BrainIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  );
}

export function PromptInput({
  onSend,
  onAbort,
  isLoading,
  disabled,
  sessions = [],
  activeSession,
  onSessionChange,
}: PromptInputProps) {
  const [value, setValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [thinkLevel, setThinkLevel] = useState<ThinkLevel>(0);
  const [planMode, setPlanMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId>("opus-4.5");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const sessionDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  useClickOutside(modelDropdownRef, useCallback(() => setModelDropdownOpen(false), []));
  useClickOutside(sessionDropdownRef, useCallback(() => setSessionDropdownOpen(false), []));

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (value.trim() && !disabled && !isLoading) {
      onSend(value.trim(), selectedModel, attachedFiles);
      setValue("");
      setAttachedFiles([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setAttachedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleModelSelect = (modelId: ModelId) => {
    setSelectedModel(modelId);
    setModelDropdownOpen(false);
  };

  const handleSessionSelect = (sessionId: string) => {
    onSessionChange?.(sessionId);
    setSessionDropdownOpen(false);
  };

  const handleThinkCycle = () => {
    setThinkLevel((prev) => ((prev + 1) % 4) as ThinkLevel);
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachedFiles((prev) => [...prev, ...files]);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedModelName = CLAUDE_MODELS.find((m) => m.id === selectedModel)?.name || "Opus 4.5";
  const showSessionSelector = sessions.length > 1;
  const thinkLabel = THINK_LEVELS[thinkLevel];
  const isThinkActive = thinkLevel > 0;

  return (
    <div className="relative">
      {/* Session Selector - Only shown when multiple sessions */}
      {showSessionSelector && (
        <div className="mb-2 relative" ref={sessionDropdownRef}>
          <button
            onClick={() => setSessionDropdownOpen(!sessionDropdownOpen)}
            className="flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text transition-colors"
          >
            <span className="text-text-secondary">Sending to:</span>
            <span className="font-medium">{activeSession?.name || "Untitled"}</span>
            {sessionDropdownOpen ? (
              <ChevronUp size={14} className="text-text-secondary" />
            ) : (
              <ChevronDown size={14} className="text-text-secondary" />
            )}
          </button>

          {/* Session Dropdown */}
          {sessionDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-background rounded-lg shadow-lg border border-border-light py-1 min-w-[200px] z-50">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleSessionSelect(session.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-text hover:bg-surface-hover transition-colors"
                >
                  <span>{session.name || "Untitled"}</span>
                  {session.id === activeSession?.id && (
                    <Check size={14} className="text-text-muted" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Input Container */}
      <div
        ref={containerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative rounded-2xl transition-all duration-300
          ${isDragging || planMode
            ? "border-2 border-dashed border-accent"
            : "border border-border-light"
          }
          bg-surface
        `}
        style={{
          animation: planMode && !isDragging ? "borderDash 0.3s ease-in-out" : undefined,
        }}
      >
        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="px-4 pt-3 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 px-2 py-1 bg-background border border-border-light rounded-md text-[12px] text-text-muted"
              >
                <Paperclip size={12} />
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="p-0.5 hover:bg-surface-hover rounded transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea Area */}
        <div className="relative px-4 pt-3 pb-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask to make changes, @mention files, run /commands"
            disabled={disabled || isLoading}
            className="w-full bg-transparent text-text placeholder-text-secondary resize-none focus:outline-none text-[14px] min-h-[60px] max-h-[200px] pr-24"
            rows={2}
          />

          {/* Keyboard Shortcut Hint */}
          <span className="absolute top-3 right-4 text-[12px] text-text-secondary">
            ⌘L to focus
          </span>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-3 pb-3">
          {/* Left: Model Selector & Options */}
          <div className="flex items-center gap-1">
            {/* Model Selector */}
            <div className="relative" ref={modelDropdownRef}>
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border-light rounded-full hover:bg-surface-hover transition-colors"
              >
                <ClaudeLogo className="text-text" />
                <span className="text-[13px] font-medium text-text">{selectedModelName}</span>
              </button>

              {/* Model Dropdown */}
              {modelDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 bg-background rounded-lg shadow-lg border border-border-light py-2 min-w-[180px] z-50">
                  <div className="px-3 py-1.5 text-[11px] font-medium text-text-secondary uppercase tracking-wide">
                    Claude Code
                  </div>
                  {CLAUDE_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-[14px] text-text hover:bg-surface-hover transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ClaudeLogo className="text-text" />
                        <span>{model.name}</span>
                      </div>
                      {model.id === selectedModel && (
                        <Check size={16} className="text-text" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Think Toggle - Cycles through levels */}
            <button
              onClick={handleThinkCycle}
              className={`flex items-center gap-1 p-2 rounded-full transition-colors ${
                isThinkActive
                  ? "bg-accent/20 border border-accent/40"
                  : "hover:bg-surface-hover"
              }`}
              title={`Extended thinking${thinkLabel ? `: ${thinkLabel}` : ""}`}
            >
              <BrainIcon className={isThinkActive ? "text-accent" : "text-text-muted"} />
              {isThinkActive && (
                <>
                  <span className="text-accent text-[11px]">:</span>
                  <span className="text-[13px] font-medium text-accent">{thinkLabel}</span>
                </>
              )}
            </button>

            {/* Plan Mode Toggle */}
            <button
              onClick={() => setPlanMode(!planMode)}
              className={`p-2 rounded-full transition-colors ${
                planMode
                  ? "bg-accent/20 border border-accent/40"
                  : "hover:bg-surface-hover"
              }`}
              title="Plan mode"
            >
              <FileText size={16} className={planMode ? "text-accent" : "text-text-muted"} />
            </button>
          </div>

          {/* Right: Attachment & Send */}
          <div className="flex items-center gap-1">
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Attachment */}
            <button
              onClick={handleAttachClick}
              className="p-2 hover:bg-surface-hover rounded-full transition-colors"
              title="Attach file"
            >
              <Paperclip size={18} className="text-text-secondary" />
            </button>

            {/* Send/Stop Button */}
            {isLoading ? (
              <button
                onClick={onAbort}
                className="p-2 bg-surface-hover hover:bg-border rounded-full transition-colors"
                title="Stop"
              >
                <Square size={18} className="text-text-muted" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!value.trim() || disabled}
                className="p-2 bg-accent hover:bg-accent-hover disabled:bg-surface-hover disabled:cursor-not-allowed rounded-full transition-colors"
                title="Send (Enter)"
              >
                <Send size={18} className={value.trim() && !disabled ? "text-white" : "text-text-secondary"} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
