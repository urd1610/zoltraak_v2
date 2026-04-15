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
  actionResults: Array<{ action: string; success: boolean; message: string; data?: unknown }>;
  isExecutingActions: boolean;

  setPageContext: (page: string, description: string, data: Record<string, unknown>, actions: PageAction[]) => void;
  clearPageContext: () => void;
  triggerRefresh: () => void;
  setActionResults: (results: Array<{ action: string; success: boolean; message: string; data?: unknown }>) => void;
  setIsExecutingActions: (v: boolean) => void;
  clearActionResults: () => void;
}

export const usePageContextStore = create<PageContextState>()((set) => ({
  currentPage: "",
  pageDescription: "",
  pageData: {},
  availableActions: [],
  refreshTrigger: 0,
  actionResults: [],
  isExecutingActions: false,

  setPageContext: (page, description, data, actions) =>
    set({ currentPage: page, pageDescription: description, pageData: data, availableActions: actions }),

  clearPageContext: () =>
    set({ currentPage: "", pageDescription: "", pageData: {}, availableActions: [], actionResults: [], isExecutingActions: false }),

  triggerRefresh: () =>
    set((s) => ({ refreshTrigger: s.refreshTrigger + 1 })),

  setActionResults: (results) =>
    set({ actionResults: results }),

  setIsExecutingActions: (v) =>
    set({ isExecutingActions: v }),

  clearActionResults: () =>
    set({ actionResults: [], isExecutingActions: false }),
}));
