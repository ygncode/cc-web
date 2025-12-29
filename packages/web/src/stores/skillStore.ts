import { create } from "zustand";
import { api } from "../lib/api";
import { findMatchingSkill } from "../lib/skillMatcher";

export interface Skill {
  name: string;
  description: string;
  instructions: string;
  source: "global" | "project";
  basePath: string;
  supportingFiles: string[];
  scripts: string[];
  allowedTools?: string[];
  model?: string;
}

interface SkillStoreState {
  skills: Skill[];
  isLoading: boolean;
  hasFetched: boolean;
  activeSkill: Skill | null;

  // Actions
  fetchSkills: () => Promise<void>;
  findMatchingSkill: (prompt: string) => Skill | null;
  setActiveSkill: (skill: Skill | null) => void;
  clearActiveSkill: () => void;
}

export const useSkillStore = create<SkillStoreState>()((set, get) => ({
  skills: [],
  isLoading: false,
  hasFetched: false,
  activeSkill: null,

  fetchSkills: async () => {
    set({ isLoading: true });
    try {
      const response = await api.getSkills();
      set({ skills: response.skills, hasFetched: true });
    } catch (error) {
      console.error("Failed to fetch skills:", error);
      set({ hasFetched: true });
    } finally {
      set({ isLoading: false });
    }
  },

  findMatchingSkill: (prompt: string) => {
    const { skills } = get();
    return findMatchingSkill(prompt, skills);
  },

  setActiveSkill: (skill: Skill | null) => {
    set({ activeSkill: skill });
  },

  clearActiveSkill: () => {
    set({ activeSkill: null });
  },
}));
