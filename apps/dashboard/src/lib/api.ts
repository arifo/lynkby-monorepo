import axios from "axios";
import type { 
  UsernameAvailabilityResponse, 
  UsernameClaimResponse,
  SessionResponse,
  MagicLinkResponse,
  AuthErrorResponse,
  LoginRequestResponse,
  WaitResponse,
  FinalizeResponse,
  LoginRequestErrorResponse,
  SuccessResponse,
  ErrorResponse,
  ApiResponse,
  PageData,
  PublicProfileData
} from '@lynkby/shared';

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
  sendMagicLink: async (email: string, redirectPath?: string): Promise<MagicLinkResponse | AuthErrorResponse> => {
    const response = await api.post("/v1/auth/request-link", { 
      email,
      redirectPath: redirectPath
    });
    return response.data;
  },
  
  // Verify magic link - matches API worker endpoint
  verifyMagicLink: async (token: string): Promise<SessionResponse | AuthErrorResponse> => {
    const response = await api.get(`/v1/auth/verify?token=${encodeURIComponent(token)}`);
    return response.data;
  },
  
  // Get current user - matches API worker endpoint
  getCurrentUser: async (): Promise<SessionResponse | AuthErrorResponse> => {
    const response = await api.get("/v1/auth/me");
    return response.data;
  },
  
  // Logout - matches API worker endpoint
  logout: async (): Promise<SuccessResponse | ErrorResponse> => {
    const response = await api.post("/v1/auth/logout");
    return response.data;
  },

  // Handoff pattern endpoints
  createLoginRequest: async (email: string, redirectPath?: string): Promise<LoginRequestResponse | LoginRequestErrorResponse> => {
    const response = await api.post("/v1/auth/request", { 
      email,
      redirectPath
    });
    return response.data;
  },

  waitForLoginRequest: async (requestId: string): Promise<WaitResponse | LoginRequestErrorResponse> => {
    const response = await api.get(`/v1/auth/wait?requestId=${encodeURIComponent(requestId)}`);
    return response.data;
  },

  finalizeLoginRequest: async (requestId: string, handshakeNonce: string): Promise<FinalizeResponse | LoginRequestErrorResponse> => {
    const response = await api.post("/v1/auth/finalize", {
      requestId,
      handshakeNonce
    });
    return response.data;
  },

  verifyCode: async (requestId: string, code: string): Promise<SuccessResponse | LoginRequestErrorResponse> => {
    const response = await api.post("/v1/auth/verify-code", {
      requestId,
      code
    });
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
  
  // Idempotent default page setup after username claim
  setupDefaultPage: async (): Promise<ApiResponse<{ pageId: string; username?: string; liveUrl?: string; fallbackUrl?: string }>> => {
    const response = await api.post("/v1/setup/page", {});
    return response.data;
  },
};

export const userAPI = {
  getProfile: async (): Promise<SessionResponse | AuthErrorResponse> => {
    const response = await api.get("/v1/auth/me");
    return response.data;
  },
  
  updateProfile: async (data: { displayName?: string; bio?: string; avatarUrl?: string }): Promise<SuccessResponse | ErrorResponse> => {
    const response = await api.put("/v1/me/page", data);
    return response.data;
  },
};


export const pagesAPI = {
  getMyPage: async (): Promise<PageData> => {
    const response = await api.get("/v1/me/page");
    return response.data;
  },
  
  updateMyPage: async (data: { 
    displayName?: string; 
    avatarUrl?: string; 
    bio?: string; 
    published?: boolean; 
    layout?: string; 
    theme?: string 
  }): Promise<SuccessResponse | ErrorResponse> => {
    const response = await api.put("/v1/me/page", data);
    return response.data;
  },
  
  bulkUpsertLinks: async (links: Array<{ 
    id?: string; 
    title: string; 
    url: string; 
    active: boolean; 
    position?: number 
  }>): Promise<ApiResponse<{ count: number }>> => {
    const response = await api.post("/v1/me/links/bulk-upsert", { links });
    return response.data;
  },
  
  publish: async (): Promise<SuccessResponse | ErrorResponse> => {
    const response = await api.post("/v1/me/publish", {});
    return response.data;
  },
  
  getPublic: async (username: string): Promise<PublicProfileData> => {
    const response = await api.get(`/v1/pages/${encodeURIComponent(username)}`);
    return response.data;
  },
};
