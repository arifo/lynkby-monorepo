import axios from "axios";

// Use localhost:8787 for development (API worker port)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  // Include credentials for cookie-based authentication
  withCredentials: true,
});

// Request interceptor to add auth token (for API calls that need it)
api.interceptors.request.use(
  (config) => {
    // For cookie-based auth, we don't need to manually add tokens
    // The browser will automatically send cookies
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  // Request magic link - matches API worker endpoint
  sendMagicLink: async (email: string, redirectPath?: string) => {
    const response = await api.post("/v1/auth/request-link", { 
      email,
      redirectPath: redirectPath || "/dashboard"
    });
    return response.data;
  },
  
  // Verify magic link - matches API worker endpoint
  verifyMagicLink: async (token: string) => {
    const response = await api.get(`/v1/auth/verify?token=${encodeURIComponent(token)}`);
    return response.data;
  },
  
  // Get current user - matches API worker endpoint
  getCurrentUser: async () => {
    const response = await api.get("/v1/auth/me");
    return response.data;
  },
  
  // Setup username for first-time users
  setupUsername: async (username: string) => {
    const response = await api.post("/v1/auth/setup-username", { username });
    return response.data;
  },
  
  // Check username availability
  checkUsernameAvailability: async (username: string) => {
    const response = await api.get(`/v1/auth/check-username?username=${encodeURIComponent(username)}`);
    return response.data;
  },
  
  // Logout - matches API worker endpoint
  logout: async () => {
    const response = await api.post("/v1/auth/logout");
    return response.data;
  },
};

export const userAPI = {
  getProfile: async () => {
    const response = await api.get("/v1/auth/me");
    return response.data;
  },
  
  updateProfile: async (data: { displayName?: string; bio?: string; avatarUrl?: string }) => {
    // This would use the pages API endpoint
    const response = await api.put("/v1/pages/profile", data);
    return response.data;
  },
};
