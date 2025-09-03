import axios from "axios";
import type { UsernameAvailabilityResponse, UsernameClaimResponse } from '@lynkby/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  // Include credentials for cookie-based authentication
  withCredentials: true,
});

// Request interceptor for cookie-based authentication
api.interceptors.request.use(
  (config) => {
    // Pure cookie-based auth - no need to add Authorization headers
    // Cookies are automatically sent with withCredentials: true
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
      redirectPath: redirectPath
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
  

  
  // Logout - matches API worker endpoint
  logout: async () => {
    const response = await api.post("/v1/auth/logout");
    return response.data;
  },
};

export const setupAPI = {
  // Check username availability - now uses setup endpoint
  checkUsernameAvailability: async (username: string): Promise<UsernameAvailabilityResponse> => {
    const response = await api.get(`/v1/setup/check-username?username=${encodeURIComponent(username)}`);
    return response.data;
  },
  
  // Claim username - now uses setup endpoint
  claimUsername: async (username: string): Promise<UsernameClaimResponse> => {
    const response = await api.post("/v1/setup/claim-username", { username });
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

export const pagesAPI = {
  getPublic: async (username: string) => {
    const response = await api.get(`/v1/pages/${encodeURIComponent(username)}`);
    return response.data as {
      ok: boolean;
      profile?: { username: string; displayName: string; bio?: string; avatarUrl?: string; links: { label: string; url: string; order: number }[] };
    };
  },
};
