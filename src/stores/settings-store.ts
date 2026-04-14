import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "admin" | "editor" | "viewer";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface NavVisibilitySetting {
  nav_href: string;
  admin_only: boolean;
  is_hidden: boolean;
  sort_order?: number | null;
}

interface SettingsState {
  // Settings dialog
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;

  // Login dialog
  isLoginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;

  // Auth state
  isLoggedIn: boolean;
  username: string | null;
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;

  // Auth helpers
  isAdmin: () => boolean;
  isEditorOrAdmin: () => boolean;
  getAuthHeaders: () => Record<string, string>;

  // Nav visibility from DB
  navSettings: NavVisibilitySetting[];
  setNavSettings: (settings: NavVisibilitySetting[]) => void;
  fetchNavSettings: () => Promise<void>;

  // General settings
  language: string;
  theme: string;
  notificationsEnabled: boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Settings dialog
      isSettingsOpen: false,
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),

      // Login dialog
      isLoginOpen: false,
      openLogin: () => set({ isLoginOpen: true }),
      closeLogin: () => set({ isLoginOpen: false }),

      // Auth state
      isLoggedIn: false,
      username: null,
      token: null,
      user: null,
      login: (token, user) =>
        set({ isLoggedIn: true, token, user, username: user.email }),
      logout: () =>
        set({ isLoggedIn: false, token: null, user: null, username: null }),

      // Auth helpers
      isAdmin: () => get().user?.role === "admin",
      isEditorOrAdmin: () => {
        const role = get().user?.role;
        return role === "admin" || role === "editor";
      },
      getAuthHeaders: () => {
        const token = get().token;
        return token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>);
      },

      // Nav visibility from DB
      navSettings: [],
      setNavSettings: (settings) => set({ navSettings: settings }),
      fetchNavSettings: async () => {
        try {
          const headers = get().getAuthHeaders();
          const res = await fetch("/api/nav-visibility", { headers });
          if (!res.ok) return;
          const data = await res.json();
          set({ navSettings: data.settings ?? [] });
        } catch {
          // ignore fetch errors
        }
      },

      // General settings
      language: "ja",
      theme: "dark",
      notificationsEnabled: true,
    }),
    {
      name: "app-settings",
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        username: state.username,
        token: state.token,
        user: state.user,
        language: state.language,
        theme: state.theme,
        notificationsEnabled: state.notificationsEnabled,
      }),
    }
  )
);
