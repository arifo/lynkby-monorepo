// Setup-related types and interfaces

export interface UsernameValidationResult {
  isValid: boolean;
  isAvailable: boolean;
  reason?: string;
}

export interface UsernameClaimResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    username: string;
  };
  error?: string;
}

export interface SetupModuleConfig {
  nodeEnv: string;
  appBase: string;
}
