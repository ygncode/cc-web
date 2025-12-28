import { X } from "lucide-react";
import { useFilePreviewStore } from "../../stores/filePreviewStore";
import { FileIcon } from "./FileIcon";

export function FilePreviewTabs() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useFilePreviewStore();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto border-l border-border ml-2 pl-2">
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;

        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer transition-colors ${
              isActive ? "bg-surface-hover" : "hover:bg-surface"
            }`}
          >
            <FileIcon filename={tab.filename} />
            <span
              className={`text-[13px] truncate max-w-[120px] ${
                isActive ? "text-text" : "text-text-muted"
              }`}
            >
              {tab.filename}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-border-light rounded transition-all"
            >
              <X size={12} className="text-text-secondary" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
