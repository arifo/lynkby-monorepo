import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthState, User, decodeToken, getStoredToken, setStoredToken, removeStoredToken } from "./auth";

interface AuthStore extends AuthState {
  login: (token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: (token: string) => {
        const user = decodeToken(token);
        if (user) {
          setStoredToken(token);
          set({ user, token, isAuthenticated: true });
        }
      },
      
      logout: () => {
        removeStoredToken();
        set({ user: null, token: null, isAuthenticated: false });
      },
      
      setUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: "lynkby-auth",
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

// Initialize auth state from stored token
if (typeof window !== "undefined") {
  const token = getStoredToken();
  if (token) {
    const user = decodeToken(token);
    if (user) {
      useAuthStore.setState({ user, token, isAuthenticated: true });
    }
  }
}
