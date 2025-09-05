import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthState, User, hasActiveSession, clearAuthCookies, setSessionFlag } from "./auth";
import { authAPI } from "./api";

interface AuthStore extends AuthState {
  login: (user: User) => void;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
  setupUsername: (username: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      
      login: (user: User) => {
        setSessionFlag(true);
        set({ user, isAuthenticated: true, isLoading: false });
      },
      
      logout: async () => {
        try {
          // Call logout API to clear server-side session
          await authAPI.logout();
        } catch (error) {
          console.error("Logout API call failed:", error);
        } finally {
          // Clear client-side state and cookies
          clearAuthCookies();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
      
      setUser: (user: User) => {
        setSessionFlag(true);
        set({ user, isAuthenticated: true, isLoading: false });
      },
      
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
      
      checkAuth: async () => {
        // Only check if we have a session cookie
        if (!hasActiveSession()) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }
        
        set({ isLoading: true });
        
        try {
          const response = await authAPI.getCurrentUser();
          if (response.ok && response.user) {
            setSessionFlag(true);
            set({ 
              user: response.user, 
              isAuthenticated: true, 
              isLoading: false 
            });
          } else {
            setSessionFlag(false);
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          setSessionFlag(false);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
      
      setupUsername: async (username: string) => {
        const { user } = get();
        if (!user) throw new Error("No user logged in");
        
        // Update the user state with the new username and clear isNewUser flag
        set({ 
          user: { ...user, username: username.toLowerCase(), isNewUser: false }, 
          isAuthenticated: true, 
          isLoading: false 
        });
      },
    }),
    {
      name: "lynkby-auth",
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

// Initialize auth state on mount
if (typeof window !== "undefined") {
  // Check if we have an active session and validate it
  useAuthStore.getState().checkAuth();
}
