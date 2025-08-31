import axios from "axios";
import { getStoredToken } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.lynkby.com";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
        localStorage.removeItem("lynkby_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  sendMagicLink: async (email: string) => {
    const response = await api.post("/v1/auth/magic-link", { email });
    return response.data;
  },
  
  verifyMagicLink: async (token: string) => {
    const response = await api.post("/v1/auth/verify", { token });
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post("/v1/auth/logout");
    return response.data;
  },
};

export const userAPI = {
  getProfile: async () => {
    const response = await api.get("/v1/auth/profile");
    return response.data;
  },
  
  updateProfile: async (data: { name?: string; avatar?: string }) => {
    const response = await api.put("/v1/auth/profile", data);
    return response.data;
  },
};
