import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { FileNode } from "./FileNode";
import { Loader2 } from "lucide-react";

interface FileTreeProps {
  showChangesOnly?: boolean;
  refreshTrigger?: number;
}

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
}

interface Change {
  status: string;
  path: string;
  type: string;
}

export function FileTree({ showChangesOnly = false, refreshTrigger = 0 }: FileTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [showChangesOnly, refreshTrigger]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (showChangesOnly) {
        const data = await api.getChanges();
        setChanges(data.changes);
      } else {
        const data = await api.getFiles();
        setTree(data.tree);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={18} className="animate-spin text-text-secondary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-4 text-[13px] text-red-400">
        {error}
      </div>
    );
  }

  if (showChangesOnly) {
    if (changes.length === 0) {
      return (
        <div className="px-4 py-6 text-[13px] text-text-secondary text-center">
          No changes
        </div>
      );
    }

    return (
      <div className="py-1">
        {changes.map((change) => (
          <div
            key={change.path}
            className="flex items-center gap-2 px-3 py-1 hover:bg-surface-hover cursor-pointer"
          >
            <span
              className={`text-[11px] font-mono w-4 ${
                change.type === "added"
                  ? "text-green-400"
                  : change.type === "deleted"
                  ? "text-red-400"
                  : "text-yellow-400"
              }`}
            >
              {change.status}
            </span>
            <span className="text-[13px] text-text truncate">{change.path}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="py-1">
      {tree.map((node) => (
        <FileNode key={node.path} node={node} depth={0} />
      ))}
    </div>
  );
}
