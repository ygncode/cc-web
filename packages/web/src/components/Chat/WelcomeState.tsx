import { GitBranch, FolderPlus, Clock, Settings } from "lucide-react";

export function WelcomeState() {
  return (
    <div className="px-6 py-8">
      {/* System messages */}
      <div className="space-y-3 mb-8">
        {/* Branch info */}
        <div className="flex items-start gap-3">
          <GitBranch size={16} className="text-text-secondary mt-0.5 flex-shrink-0" />
          <div className="text-[13px] text-text-muted">
            Working in <span className="text-text font-medium">current directory</span>
          </div>
        </div>

        {/* Folder created */}
        <div className="flex items-start gap-3">
          <FolderPlus size={16} className="text-text-secondary mt-0.5 flex-shrink-0" />
          <div className="text-[13px] text-text-muted">
            Ready to work with your files
          </div>
        </div>

        {/* Optional items */}
        <div className="flex items-start gap-3">
          <Clock size={16} className="text-text-secondary mt-0.5 flex-shrink-0" />
          <div className="text-[13px] text-text-muted">
            Optional: add a setup script{" "}
            <span className="text-text-secondary">↗</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Settings size={16} className="text-text-secondary mt-0.5 flex-shrink-0" />
          <div className="text-[13px] text-text-muted">
            Optional: select working directories{" "}
            <span className="text-text-secondary">↗</span>
          </div>
        </div>
      </div>

      {/* Done message */}
      <div className="bg-surface rounded-lg px-4 py-3 inline-block">
        <p className="text-[13px] text-text font-medium mb-0.5">
          Done! You're in an isolated copy of your codebase.
        </p>
        <p className="text-[13px] text-text-muted">
          Send a message to get started
        </p>
      </div>
    </div>
  );
}
