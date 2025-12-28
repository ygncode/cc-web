import { useState } from "react";
import { ChevronRight, ChevronDown, Terminal, Copy, Check } from "lucide-react";
import type { Message } from "../../stores/sessionStore";

interface ToolCallBlockProps {
  toolMessages: Message[];
  assistantMessageCount?: number;
}

export function ToolCallBlock({ toolMessages, assistantMessageCount = 1 }: ToolCallBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const toolCount = toolMessages.length;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const content = toolMessages
      .map((msg) => {
        const toolName = msg.toolName || "Unknown";
        const input = msg.toolInput ? JSON.stringify(msg.toolInput, null, 2) : "";
        const result = msg.toolResult ? JSON.stringify(msg.toolResult, null, 2) : "";
        return `Tool: ${toolName}\nInput: ${input}\nResult: ${result}`;
      })
      .join("\n\n");

    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="py-2">
      {/* Collapsed Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left group"
      >
        <div className="flex items-center gap-2 text-text-muted">
          {isExpanded ? (
            <ChevronDown size={16} className="text-text-secondary" />
          ) : (
            <ChevronRight size={16} className="text-text-secondary" />
          )}
          <span className="text-[13px]">
            {toolCount} tool call{toolCount !== 1 ? "s" : ""}, {assistantMessageCount} message
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-text-secondary">
            <Terminal size={14} />
          </span>
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-surface-hover rounded transition-colors"
            title="Copy tool calls"
          >
            {copied ? (
              <Check size={14} className="text-accent" />
            ) : (
              <Copy size={14} className="text-text-secondary" />
            )}
          </button>
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
