import { useFilePreviewStore } from "../../stores/filePreviewStore";
import { FilePathBar } from "./FilePathBar";
import { FileContent } from "./FileContent";

export function FilePreviewPanel() {
  const { tabs, activeTabId } = useFilePreviewStore();

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        No file selected
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <FilePathBar path={activeTab.path} content={activeTab.content} />
      <div className="flex-1 overflow-auto">
        <FileContent tab={activeTab} />
      </div>
    </div>
  );
}
