import { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  Briefcase,
  Check,
  Copy,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Message } from "../../stores/sessionStore";

interface SubagentBlockProps {
  taskMessage: Message;
  nestedToolMessages?: Message[];
}

// Format elapsed time as "Xs" or "Xm Ys"
function formatElapsedTime(startTime: number, endTime?: number): string {
  const elapsed = (endTime || Date.now()) - startTime;
  const seconds = Math.floor(elapsed / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function SubagentBlock({
  taskMessage,
  nestedToolMessages = [],
}: SubagentBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>("");

  // Check if the task is explicitly complete (has an end time)
  const isTaskComplete = taskMessage.taskEndTime !== undefined;

  // Check if any nested tools are still loading (no result)
  const hasLoadingNestedTools = nestedToolMessages.some(
    msg => msg.toolResult === undefined || msg.toolResult === null
  );

  // If task is complete, don't show loading regardless of nested tool states
  // (tool results can arrive out of order, leaving some without results)
  const isLoading = isTaskComplete
    ? false
    : (taskMessage.isTaskLoading ?? false) || hasLoadingNestedTools;
  const taskType = taskMessage.taskType || "Task";
  const taskDescription = taskMessage.taskDescription || "Running task...";
  const toolCount = taskMessage.taskToolCount ?? nestedToolMessages.length;

  // Update elapsed time every second while loading
  useEffect(() => {
    if (!taskMessage.taskStartTime) return;

    const updateTime = () => {
      setElapsedTime(
        formatElapsedTime(taskMessage.taskStartTime!, taskMessage.taskEndTime)
      );
    };

    updateTime();

    if (isLoading) {
      const interval = setInterval(updateTime, 1000);
      return () => clearInterval(interval);
    }
  }, [taskMessage.taskStartTime, taskMessage.taskEndTime, isLoading]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const content = [
      `Task: ${taskType}`,
      `Description: ${taskDescription}`,
      taskMessage.taskPrompt ? `Prompt: ${taskMessage.taskPrompt}` : "",
      taskMessage.taskResult ? `Result: ${taskMessage.taskResult}` : "",
      nestedToolMessages.length > 0
        ? `\nTool Calls (${nestedToolMessages.length}):\n` +
          nestedToolMessages
            .map((msg) => {
              const toolName = msg.toolName || "Unknown";
              const input = msg.toolInput
                ? JSON.stringify(msg.toolInput, null, 2)
                : "";
              const result = msg.toolResult
                ? JSON.stringify(msg.toolResult, null, 2)
                : "";
              return `- ${toolName}\n  Input: ${input}\n  Result: ${result}`;
            })
            .join("\n\n")
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="py-2">
      {/* Header */}
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

          {/* Task type badge */}
          <span className="px-2 py-0.5 text-[11px] font-medium text-text-secondary bg-surface-hover rounded border border-border-light">
            {taskType}
          </span>

          {/* Task description */}
          <span className="text-[13px] text-text-muted truncate max-w-[400px]">
            {taskDescription}
          </span>

          {/* Status indicator */}
          {!isLoading && (
            <Check size={14} className="text-accent ml-1 flex-shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Tool count */}
          {toolCount > 0 && (
            <span className="text-[12px] text-text-muted">
              {toolCount} tool call{toolCount !== 1 ? "s" : ""}
            </span>
          )}

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

          {/* Copy button (visible on hover, only when complete) */}
          {!isLoading && (
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-surface rounded transition-colors opacity-0 group-hover:opacity-100"
              title="Copy task details"
            >
              {copied ? (
                <Check size={14} className="text-accent" />
              ) : (
                <Copy size={14} className="text-text-secondary" />
              )}
            </button>
          )}
        </div>
      </button>

      {/* Result Preview (shown when collapsed and task is complete) */}
      {!isExpanded && !isLoading && taskMessage.taskResult && (
        <div className="mt-3 text-[14px] text-text leading-relaxed">
          <ReactMarkdown
              components={{
                p({ children }) {
                  return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
                },
                // Lists with proper indentation and spacing
                ul({ children }) {
                  return <ul className="list-disc pl-6 mb-3 space-y-1.5">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="list-decimal pl-6 mb-3 space-y-1.5">{children}</ol>;
                },
                li({ children }) {
                  return <li className="leading-relaxed">{children}</li>;
                },
                // Inline code styling
                code({ className, children, ...props }) {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code
                        className="bg-surface-hover px-1.5 py-0.5 rounded text-[13px] font-mono text-text"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <pre className="bg-surface rounded-lg p-3 my-3 overflow-x-auto text-[13px] font-mono">
                      <code {...props}>{children}</code>
                    </pre>
                  );
                },
                // Headings
                h1({ children }) {
                  return <h1 className="text-xl font-bold text-text mt-6 mb-3 first:mt-0">{children}</h1>;
                },
                h2({ children }) {
                  return <h2 className="text-lg font-bold text-text mt-5 mb-2 first:mt-0">{children}</h2>;
                },
                h3({ children }) {
                  return <h3 className="text-base font-semibold text-text mt-4 mb-2 first:mt-0">{children}</h3>;
                },
                // Strong/Bold text
                strong({ children }) {
                  return <strong className="font-semibold text-text">{children}</strong>;
                },
              }}
            >
              {taskMessage.taskResult}
            </ReactMarkdown>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 ml-6 space-y-4">
          {/* Task prompt/description */}
          {taskMessage.taskPrompt && (
            <div className="text-[13px] text-text leading-relaxed border-l-2 border-border-light pl-4">
              <ReactMarkdown
                components={{
                  p({ children }) {
                    return <p className="mb-2 last:mb-0">{children}</p>;
                  },
                  ul({ children }) {
                    return (
                      <ul className="list-disc list-inside mb-2 space-y-1">
                        {children}
                      </ul>
                    );
                  },
                  ol({ children }) {
                    return (
                      <ol className="list-decimal list-inside mb-2 space-y-1">
                        {children}
                      </ol>
                    );
                  },
                }}
              >
                {taskMessage.taskPrompt}
              </ReactMarkdown>
            </div>
          )}

          {/* Nested tool calls */}
          {nestedToolMessages.length > 0 && (
            <div className="border-l-2 border-border-light pl-4">
              <div className="text-[12px] text-text-secondary mb-2">
                {nestedToolMessages.length} tool call
                {nestedToolMessages.length !== 1 ? "s" : ""}
              </div>
              <div className="space-y-3">
                {nestedToolMessages.map((msg) => (
                  <div key={msg.id} className="text-[11px]">
                    <div className="font-medium text-text-muted mb-1">
                      {msg.toolName || "Unknown Tool"}
                    </div>
                    {msg.toolInput && (
                      <pre className="bg-surface rounded-md p-2 font-mono text-text overflow-x-auto mb-1">
                        {JSON.stringify(msg.toolInput, null, 2)}
                      </pre>
                    )}
                    {msg.toolResult !== undefined && msg.toolResult !== null && (
                      <pre className="bg-surface rounded-md p-2 font-mono text-text overflow-x-auto max-h-[150px] overflow-y-auto">
                        {typeof msg.toolResult === "string"
                          ? msg.toolResult
                          : JSON.stringify(msg.toolResult, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Task result */}
          {taskMessage.taskResult && (
            <div className="border-l-2 border-accent/30 pl-4">
              <div className="text-[12px] text-text-secondary mb-2">Result</div>
              <div className="text-[13px] text-text leading-relaxed">
                <ReactMarkdown
                  components={{
                    p({ children }) {
                      return <p className="mb-2 last:mb-0">{children}</p>;
                    },
                    code({ className, children, ...props }) {
                      const isInline = !className;
                      if (isInline) {
                        return (
                          <code
                            className="bg-surface-hover px-1.5 py-0.5 rounded text-[12px] font-mono text-text"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }
                      return (
                        <pre className="bg-surface rounded-md p-2 text-[11px] font-mono overflow-x-auto">
                          <code {...props}>{children}</code>
                        </pre>
                      );
                    },
                  }}
                >
                  {taskMessage.taskResult}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
