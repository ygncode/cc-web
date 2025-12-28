import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface FilePathBarProps {
  path: string;
  content: string | null;
}

function CopyButton({
  text,
  label,
}: {
  text: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded hover:bg-surface-hover transition-colors text-text-muted hover:text-text"
      title={label}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

export function FilePathBar({ path, content }: FilePathBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-border">
      <div className="flex items-center gap-1 text-[13px] text-text-secondary overflow-hidden">
        <span className="truncate">{path}</span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {content && <CopyButton text={content} label="Copy content" />}
      </div>
    </div>
  );
}
