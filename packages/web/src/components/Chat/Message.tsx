import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Loader2, FileText, File, Image, Copy, Check, ChevronRight, ChevronDown, Briefcase } from "lucide-react";
import type { Message as MessageType, Attachment } from "../../stores/sessionStore";

interface MessageProps {
  message: MessageType;
  associatedToolMessages?: MessageType[];
}

// Get file type label from mime type
function getFileTypeLabel(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("text/")) return "TEXT";
  if (mimeType.includes("javascript") || mimeType.includes("typescript")) return "CODE";
  return "FILE";
}

// Attachment preview component
function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  const [imageError, setImageError] = useState(false);
  const isImage = attachment.mimeType.startsWith("image/");
  const typeLabel = getFileTypeLabel(attachment.mimeType);

  // Build the URL for the attachment
  // Properly encode the path segments while preserving slashes
  const encodePath = (p: string) => {
    return p.split('/').map(segment => encodeURIComponent(segment)).join('/');
  };
  const attachmentUrl = `/api/files/attachment/${encodePath(attachment.storedPath)}`;

  // Get simplified display name for images
  const getDisplayName = () => {
    if (isImage) {
      // For pasted images, show a simple name
      if (attachment.originalName.startsWith("pasted-image-")) {
        return "image.png";
      }
    }
    return attachment.originalName;
  };

  return (
    <div className="flex items-center gap-3 bg-background border border-border-light rounded-lg px-3 py-2 max-w-[250px]">
      {/* Thumbnail or Icon */}
      <div className="w-10 h-10 flex-shrink-0 rounded-md overflow-hidden border border-border-light bg-surface flex items-center justify-center">
        {isImage && !imageError ? (
          <img
            src={attachmentUrl}
            alt={attachment.originalName}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : isImage ? (
          <Image size={20} className="text-text-muted" />
        ) : attachment.mimeType === "application/pdf" ? (
          <FileText size={20} className="text-text-muted" />
        ) : (
          <File size={20} className="text-text-muted" />
        )}
      </div>

      {/* File info */}
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] font-medium text-text truncate max-w-[150px]">
          {getDisplayName()}
        </span>
        <span className="text-[11px] text-text-secondary uppercase tracking-wide">
          {typeLabel}
        </span>
      </div>
    </div>
  );
}

// Format elapsed time as "Xs" or "Xm, Ys"
function formatElapsedTime(startTime: Date, endTime?: Date): string {
  const start = startTime.getTime();
  const end = endTime ? endTime.getTime() : Date.now();
  const elapsed = Math.floor((end - start) / 1000);

  if (elapsed < 60) {
    return `${elapsed}s`;
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}m, ${seconds}s`;
}

// Loading indicator with elapsed time
function LoadingIndicator({ startTime }: { startTime?: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = startTime || Date.now();

    // Update elapsed time every 100ms for smooth display
    const interval = setInterval(() => {
      setElapsed((Date.now() - start) / 1000);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime]);

  // Format time - convert to minutes when >= 60 seconds
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="flex items-center gap-2 text-text-muted py-1">
      <Loader2 size={14} className="animate-spin" />
      <span className="text-[13px] font-mono tabular-nums">
        {formatTime(elapsed)}
      </span>
    </div>
  );
}

export function Message({ message, associatedToolMessages = [] }: MessageProps) {
  const [copied, setCopied] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const isUser = message.role === "user";
  const isStreaming = (message as any).isStreaming === true;

  // Check if any associated tools are still loading (no result)
  const hasLoadingTools = associatedToolMessages.some(
    (tool) => tool.toolResult === undefined || tool.toolResult === null
  );
  const hasTools = associatedToolMessages.length > 0;

  const content =
    typeof message.content === "string"
      ? message.content
      : JSON.stringify(message.content);

  // Only show footer when truly complete (not streaming, has content, has endTime, no loading tools)
  const isAssistantComplete = message.role === "assistant" && !isStreaming && !!content && !!message.endTime && !hasLoadingTools;

  const handleCopy = async () => {
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // User message: right-aligned with bubble
  if (isUser) {
    const hasAttachments = message.attachments && message.attachments.length > 0;
    const hasActiveSkill = !!message.activeSkill;

    return (
      <div className="flex flex-col items-end gap-2 py-2">
        {/* Active Skill Badge */}
        {hasActiveSkill && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 border border-accent/20 rounded-full">
            <span className="text-[11px] font-medium text-accent">
              Using: {message.activeSkill}
            </span>
          </div>
        )}

        {/* Attachments */}
        {hasAttachments && (
          <div className="flex flex-wrap gap-2 justify-end max-w-[80%]">
            {message.attachments!.map((attachment) => (
              <AttachmentPreview key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        {/* Message content */}
        {content && (
          <div className="bg-user-bubble rounded-2xl px-4 py-3 max-w-[80%]">
            <span className="text-[14px] text-text whitespace-pre-wrap">{content}</span>
          </div>
        )}
      </div>
    );
  }

  // Tool calls section - extracted to avoid duplication
  const isComplete = !isStreaming && !hasLoadingTools;
  const toolCallsSection = hasTools ? (
    <div className={isComplete ? "mb-3" : "mt-3"}>
      <button
        onClick={() => setToolsExpanded(!toolsExpanded)}
        className="flex items-center gap-2 text-text-muted hover:text-text transition-colors"
      >
        {toolsExpanded ? (
          <ChevronDown size={14} />
        ) : (
          <ChevronRight size={14} />
        )}
        <Briefcase size={12} />
        <span className="text-[12px]">
          {associatedToolMessages.length} tool call{associatedToolMessages.length !== 1 ? "s" : ""}
        </span>
        {hasLoadingTools && (
          <Loader2 size={12} className="animate-spin" />
        )}
      </button>

      {toolsExpanded && (
        <div className="mt-2 ml-5 space-y-3 border-l-2 border-border-light pl-3">
          {associatedToolMessages.map((tool) => (
            <div key={tool.id} className="text-[12px]">
              <div className="font-medium text-text-muted mb-1">
                {tool.toolName || "Unknown Tool"}
              </div>
              {tool.toolInput && (
                <pre className="bg-surface rounded-md p-2 font-mono text-text overflow-x-auto mb-1 text-[11px]">
                  {JSON.stringify(tool.toolInput, null, 2)}
                </pre>
              )}
              {tool.toolResult !== undefined && tool.toolResult !== null ? (
                <pre className="bg-surface rounded-md p-2 font-mono text-text overflow-x-auto max-h-[150px] overflow-y-auto text-[11px]">
                  {typeof tool.toolResult === "string"
                    ? tool.toolResult
                    : JSON.stringify(tool.toolResult, null, 2)}
                </pre>
              ) : (
                <div className="flex items-center gap-2 text-text-muted">
                  <Loader2 size={12} className="animate-spin" />
                  <span className="text-[11px]">Running...</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null;

  // Assistant message: left-aligned without bubble
  return (
    <div className="flex justify-start py-2">
      <div className="max-w-[90%]">
        {/* Tool calls at TOP - only when complete */}
        {isComplete && toolCallsSection}

        <div className="text-[14px] text-text leading-relaxed">
          {content ? (
            <>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const isInline = !match;

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
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        margin: "12px 0",
                        borderRadius: "8px",
                        fontSize: "13px",
                      }}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
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
                h4({ children }) {
                  return <h4 className="text-sm font-semibold text-text mt-3 mb-1 first:mt-0">{children}</h4>;
                },
                // Paragraphs with better spacing
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
                // Strong/Bold text
                strong({ children }) {
                  return <strong className="font-semibold text-text">{children}</strong>;
                },
                // Emphasis/Italic text
                em({ children }) {
                  return <em className="italic">{children}</em>;
                },
                // Blockquotes
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-4 border-accent/50 pl-4 my-3 text-text-muted italic">
                      {children}
                    </blockquote>
                  );
                },
                // Horizontal rule
                hr() {
                  return <hr className="my-4 border-border-light" />;
                },
                // Links
                a({ href, children }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      {children}
                    </a>
                  );
                },
                // Pre block (for code without language)
                pre({ children }) {
                  return (
                    <pre className="bg-surface rounded-lg p-3 my-3 overflow-x-auto text-[13px] font-mono">
                      {children}
                    </pre>
                  );
                },
                // Table components (GFM)
                table({ children }) {
                  return (
                    <div className="my-3 overflow-x-auto">
                      <table className="min-w-full border-collapse border border-border-light rounded-lg overflow-hidden">
                        {children}
                      </table>
                    </div>
                  );
                },
                thead({ children }) {
                  return <thead className="bg-surface">{children}</thead>;
                },
                tbody({ children }) {
                  return <tbody className="divide-y divide-border-light">{children}</tbody>;
                },
                tr({ children }) {
                  return <tr className="hover:bg-surface-hover/50 transition-colors">{children}</tr>;
                },
                th({ children }) {
                  return (
                    <th className="px-4 py-2 text-left text-[13px] font-semibold text-text border-b border-border-light">
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td className="px-4 py-2 text-[13px] text-text">
                      {children}
                    </td>
                  );
                },
                // Strikethrough (GFM)
                del({ children }) {
                  return <del className="line-through text-text-muted">{children}</del>;
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </>
          ) : null}
        </div>

        {/* Tool calls at BOTTOM - only during loading */}
        {!isComplete && toolCallsSection}

        {/* Loading indicator at the bottom while streaming or tools loading */}
        {(isStreaming || hasLoadingTools) && (
          <LoadingIndicator startTime={message.timestamp?.getTime()} />
        )}

        {/* Footer with elapsed time and copy button */}
        {isAssistantComplete && (
          <div className="flex items-center gap-2 mt-3 text-text-muted">
            {message.timestamp && message.endTime && (
              <span className="text-[13px]">
                {formatElapsedTime(message.timestamp, message.endTime)}
              </span>
            )}
            <span className="text-text-muted/50">·</span>
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-surface-hover rounded transition-colors"
              title="Copy response"
            >
              {copied ? (
                <Check size={16} className="text-accent" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
