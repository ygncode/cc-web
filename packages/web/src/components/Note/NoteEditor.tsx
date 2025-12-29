import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useCallback,
  useState,
} from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useNoteStore } from "../../stores/noteStore";
import { useLayoutStore } from "../../stores/layoutStore";
import "./blocknote.css";

export interface NoteEditorRef {
  focus: () => void;
}

export const NoteEditor = forwardRef<NoteEditorRef>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { content, setContent } = useNoteStore();
  const theme = useLayoutStore((state) => state.theme);
  const [isInitialized, setIsInitialized] = useState(false);
  const contentRef = useRef(content);

  // Handle image upload - convert to base64 data URL for local storage
  const uploadFile = useCallback(async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // Create the editor instance with upload handler
  const editor = useCreateBlockNote({
    uploadFile,
  });

  // Initialize content from markdown on mount
  useEffect(() => {
    if (!editor || isInitialized) return;

    const initializeContent = async () => {
      if (contentRef.current) {
        try {
          const blocks = await editor.tryParseMarkdownToBlocks(contentRef.current);
          editor.replaceBlocks(editor.document, blocks);
        } catch (e) {
          console.error("Failed to parse initial markdown:", e);
        }
      }
      setIsInitialized(true);
    };

    initializeContent();
  }, [editor, isInitialized]);

  // Handle content changes
  const handleChange = useCallback(async () => {
    if (!editor || !isInitialized) return;

    try {
      const markdown = await editor.blocksToMarkdownLossy(editor.document);
      setContent(markdown);
    } catch (e) {
      console.error("Failed to convert to markdown:", e);
    }
  }, [editor, isInitialized, setContent]);

  // Expose focus method via ref
  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        editor?.focus();
      },
    }),
    [editor]
  );

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto blocknote-editor-container relative"
    >
      <span className="absolute top-4 right-4 text-[13px] text-text-secondary pointer-events-none">
        ⌘L to focus
      </span>
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme={theme}
        sideMenu={false}
      />
    </div>
  );
});

NoteEditor.displayName = "NoteEditor";
