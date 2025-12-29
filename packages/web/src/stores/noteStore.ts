import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NoteState {
  content: string;
  isActive: boolean;

  setContent: (content: string) => void;
  setActive: (active: boolean) => void;
  toggleActive: () => void;
}

export const useNoteStore = create<NoteState>()(
  persist(
    (set) => ({
      content: "",
      isActive: false,

      setContent: (content: string) => set({ content }),
      setActive: (active: boolean) => set({ isActive: active }),
      toggleActive: () => set((state) => ({ isActive: !state.isActive })),
    }),
    {
      name: "cc-web-note",
      partialize: (state) => ({ content: state.content }), // Only persist content, not active state
    }
  )
);
