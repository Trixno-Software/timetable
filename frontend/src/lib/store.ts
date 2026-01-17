import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  role: string;
  branch_name?: string;
  school?: {
    id: string;
    name: string;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        // Also store in localStorage for API interceptor
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
          localStorage.setItem('user', JSON.stringify(user));
        }
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// App-wide settings store
interface SettingsState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'light',

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'settings-storage',
    }
  )
);

// Selection context store (for selected session, shift, etc.)
interface SelectionState {
  selectedSessionId: string | null;
  selectedShiftId: string | null;
  selectedGradeId: string | null;
  setSelectedSession: (id: string | null) => void;
  setSelectedShift: (id: string | null) => void;
  setSelectedGrade: (id: string | null) => void;
  clearSelections: () => void;
}

export const useSelectionStore = create<SelectionState>()(
  persist(
    (set) => ({
      selectedSessionId: null,
      selectedShiftId: null,
      selectedGradeId: null,

      setSelectedSession: (id) => set({ selectedSessionId: id }),
      setSelectedShift: (id) => set({ selectedShiftId: id }),
      setSelectedGrade: (id) => set({ selectedGradeId: id }),
      clearSelections: () =>
        set({
          selectedSessionId: null,
          selectedShiftId: null,
          selectedGradeId: null,
        }),
    }),
    {
      name: 'selection-storage',
    }
  )
);

// Helper function to check if user has a specific role
export const hasRole = (userRole: string | undefined, allowedRoles: string[]): boolean => {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};

// Permission helper functions
export const canManageSchools = (role: string | undefined): boolean => {
  return hasRole(role, ['super_admin']);
};

export const canManageBranches = (role: string | undefined): boolean => {
  return hasRole(role, ['super_admin', 'school_admin']);
};

// Context store for branch/session selection
interface ContextState {
  selectedBranch: string | null;
  selectedSession: string | null;
  setSelectedBranch: (branch: string | null) => void;
  setSelectedSession: (session: string | null) => void;
}

export const useContextStore = create<ContextState>()(
  persist(
    (set) => ({
      selectedBranch: null,
      selectedSession: null,
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
      setSelectedSession: (session) => set({ selectedSession: session }),
    }),
    {
      name: 'context-storage',
    }
  )
);
