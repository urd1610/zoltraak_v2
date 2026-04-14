import { create } from "zustand";

export interface PageAction {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    enum?: string[];
  }>;
}

export interface PageContextState {
  currentPage: string;
  pageDescription: string;
  pageData: Record<string, unknown>;
  availableActions: PageAction[];
  refreshTrigger: number;

  setPageContext: (page: string, description: string, data: Record<string, unknown>, actions: PageAction[]) => void;
  clearPageContext: () => void;
  triggerRefresh: () => void;
}

export const usePageContextStore = create<PageContextState>()((set) => ({
  currentPage: "",
  pageDescription: "",
  pageData: {},
  availableActions: [],
  refreshTrigger: 0,

  setPageContext: (page, description, data, actions) =>
    set({ currentPage: page, pageDescription: description, pageData: data, availableActions: actions }),

  clearPageContext: () =>
    set({ currentPage: "", pageDescription: "", pageData: {}, availableActions: [] }),

  triggerRefresh: () =>
    set((s) => ({ refreshTrigger: s.refreshTrigger + 1 })),
}));
