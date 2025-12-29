import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useFilePreviewStore } from "../../stores/filePreviewStore";
import { getFileIcon } from "../../lib/fileUtils";

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
}

interface FileNodeProps {
  node: TreeNode;
  depth: number;
}

export function FileNode({ node, depth }: FileNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const openFile = useFilePreviewStore((state) => state.openFile);

  const handleClick = () => {
    if (node.type === "directory") {
      setIsExpanded(!isExpanded);
    } else {
      openFile(node.path);
    }
  };

  const fileIcon = node.type === "file" ? getFileIcon(node.name) : null;

  return (
    <div>
      <div
        onClick={handleClick}
        className="flex items-center gap-1 px-2 py-[3px] cursor-pointer hover:bg-surface-hover transition-colors group"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Expand/Collapse Icon */}
        {node.type === "directory" ? (
          <span className="w-4 h-4 flex items-center justify-center text-text-secondary flex-shrink-0">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* File/Folder Icon */}
        {node.type === "directory" ? (
          <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
        ) : (
          <span
            className="w-4 h-4 flex items-center justify-center text-[10px] font-bold flex-shrink-0 rounded-sm"
            style={{ color: fileIcon?.color }}
          >
            {fileIcon?.icon}
          </span>
        )}

        {/* Name */}
        <span className="text-[13px] text-text truncate ml-1">{node.name}</span>
      </div>

      {/* Children */}
      {node.type === "directory" && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
