import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'lead' | 'member';
  status: 'pending' | 'active';
  workspace_id: string;
  avatar_url?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, any>;
}

interface AuthState {
  user: User | null;
  token: string | null;
  workspace: Workspace | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, workspace: Workspace) => void;
  updateWorkspaceSettings: (settings: Record<string, any>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Load initial state from localStorage
  const savedToken = localStorage.getItem('nurevo_token');
  const savedUser = localStorage.getItem('nurevo_user');
  const savedWorkspace = localStorage.getItem('nurevo_workspace');

  return {
    user: savedUser ? JSON.parse(savedUser) : null,
    token: savedToken || null,
    workspace: savedWorkspace ? JSON.parse(savedWorkspace) : null,
    isAuthenticated: !!savedToken,
    
    setAuth: (user, token, workspace) => {
      localStorage.setItem('nurevo_token', token);
      localStorage.setItem('nurevo_user', JSON.stringify(user));
      localStorage.setItem('nurevo_workspace', JSON.stringify(workspace));
      set({ user, token, workspace, isAuthenticated: true });
    },
    
    updateWorkspaceSettings: (newSettings) => {
      set((state) => {
        if (!state.workspace) return {};
        const updatedWorkspace = {
          ...state.workspace,
          settings: { ...state.workspace.settings, ...newSettings }
        };
        localStorage.setItem('nurevo_workspace', JSON.stringify(updatedWorkspace));
        return { workspace: updatedWorkspace };
      });
    },
    
    logout: () => {
      localStorage.removeItem('nurevo_token');
      localStorage.removeItem('nurevo_user');
      localStorage.removeItem('nurevo_workspace');
      set({ user: null, token: null, workspace: null, isAuthenticated: false });
    }
  };
});
