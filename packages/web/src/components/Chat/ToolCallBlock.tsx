import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Briefcase, Loader2 } from "lucide-react";
import type { Message } from "../../stores/sessionStore";

interface ToolCallBlockProps {
  toolMessages: Message[];
}

// Get a summary description from the first tool call
function getToolSummary(toolMessages: Message[]): string {
  if (toolMessages.length === 0) return "Tool calls";

  // Try to get description from first tool's input
  const firstTool = toolMessages[0];
  if (firstTool.toolInput) {
    // Common description fields in tool inputs
    const input = firstTool.toolInput as Record<string, unknown>;
    if (typeof input.description === "string") return input.description;
    if (typeof input.prompt === "string") {
      // Truncate long prompts
      const prompt = input.prompt as string;
      return prompt.length > 50 ? prompt.slice(0, 47) + "..." : prompt;
    }
    if (typeof input.command === "string") {
      const cmd = input.command as string;
      return cmd.length > 50 ? cmd.slice(0, 47) + "..." : cmd;
    }
    if (typeof input.pattern === "string") return `Pattern: ${input.pattern}`;
    if (typeof input.file_path === "string") {
      const path = input.file_path as string;
      const fileName = path.split("/").pop() || path;
      return `File: ${fileName}`;
    }
  }

  // Fallback to tool name
  return firstTool.toolName || "Tool calls";
}

// Get the primary tool type from the first tool
function getToolType(toolMessages: Message[]): string {
  if (toolMessages.length === 0) return "Tools";
  const firstTool = toolMessages[0];
  return firstTool.toolName || "Tools";
}

// Check if tool group is still loading (last tool has no result)
function isToolGroupLoading(toolMessages: Message[]): boolean {
  if (toolMessages.length === 0) return false;
  const lastTool = toolMessages[toolMessages.length - 1];
  return lastTool.toolResult === undefined || lastTool.toolResult === null;
}

// Get start time from first tool message
function getStartTime(toolMessages: Message[]): number | null {
  if (toolMessages.length === 0) return null;
  const firstTool = toolMessages[0];
  return firstTool.timestamp ? new Date(firstTool.timestamp).getTime() : null;
}

// Get end time from last tool message (when it has a result)
function getEndTime(toolMessages: Message[]): number | null {
  if (toolMessages.length === 0) return null;
  const lastTool = toolMessages[toolMessages.length - 1];
  // If last tool has result, use its timestamp as end time
  if (lastTool.toolResult !== undefined && lastTool.toolResult !== null) {
    return lastTool.timestamp ? new Date(lastTool.timestamp).getTime() : null;
  }
  return null;
}

// Format elapsed time as "Xs" or "Xm Ys"
function formatElapsedTime(startTime: number, endTime?: number | null): string {
  const elapsed = (endTime || Date.now()) - startTime;
  const seconds = Math.floor(elapsed / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function ToolCallBlock({ toolMessages }: ToolCallBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>("");

  const toolCount = toolMessages.length;
  const toolType = getToolType(toolMessages);
  const toolSummary = getToolSummary(toolMessages);
  const isLoading = isToolGroupLoading(toolMessages);
  const startTime = getStartTime(toolMessages);
  const endTime = getEndTime(toolMessages);

  // Update elapsed time every second while loading
  useEffect(() => {
    if (!startTime) return;

    const updateTime = () => {
      setElapsedTime(formatElapsedTime(startTime, endTime));
    };

    updateTime();

    if (isLoading) {
      const interval = setInterval(updateTime, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, endTime, isLoading]);

  return (
    <div className="py-2">
      {/* Collapsed Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left group hover:bg-surface-hover/50 rounded-lg p-2 -m-2 transition-colors"
      >
        <div className="flex items-center gap-2">
          {/* Chevron */}
          {isExpanded ? (
            <ChevronDown size={16} className="text-text-secondary" />
          ) : (
            <ChevronRight size={16} className="text-text-secondary" />
          )}

          {/* Briefcase icon */}
          <Briefcase size={14} className="text-text-secondary" />

          {/* Tool type badge */}
          <span className="px-2 py-0.5 text-[11px] font-medium text-text-secondary bg-surface-hover rounded border border-border-light">
            {toolType}
          </span>

          {/* Tool description/summary */}
          <span className="text-[13px] text-text-muted truncate max-w-[400px]">
            {toolSummary}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Tool count */}
          <span className="text-[12px] text-text-muted">
            {toolCount} tool call{toolCount !== 1 ? "s" : ""}
          </span>

          {/* Loading indicator or elapsed time */}
          {isLoading ? (
            <div className="flex items-center gap-1.5 text-text-muted">
              <Loader2 size={12} className="animate-spin" />
              {elapsedTime && (
                <span className="text-[11px] tabular-nums">{elapsedTime}</span>
              )}
            </div>
          ) : (
            elapsedTime && (
              <span className="text-[11px] text-text-muted tabular-nums">
                {elapsedTime}
              </span>
            )
          )}

        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 ml-6 space-y-4">
          {toolMessages.map((msg) => (
            <div key={msg.id} className="border-l-2 border-border-light pl-4">
              <div className="text-[12px] font-medium text-text-muted mb-1">
                {msg.toolName || "Unknown Tool"}
              </div>

              {msg.toolInput && (
                <div className="mb-2">
                  <div className="text-[11px] text-text-secondary mb-1">Input:</div>
                  <pre className="bg-surface rounded-md p-2 text-[11px] font-mono text-text overflow-x-auto">
                    {JSON.stringify(msg.toolInput, null, 2)}
                  </pre>
                </div>
              )}

              {msg.toolResult !== undefined && msg.toolResult !== null && (
                <div>
                  <div className="text-[11px] text-text-secondary mb-1">Result:</div>
                  <pre className="bg-surface rounded-md p-2 text-[11px] font-mono text-text overflow-x-auto max-h-[200px] overflow-y-auto">
                    {typeof msg.toolResult === "string"
                      ? msg.toolResult
                      : JSON.stringify(msg.toolResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
