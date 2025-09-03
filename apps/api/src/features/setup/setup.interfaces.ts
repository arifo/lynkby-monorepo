import type { Context } from "hono";
import type { 
  UsernameValidationResult, 
  UsernameClaimResult 
} from "./setup.types";

// Setup module configuration
export interface SetupModuleConfig {
  nodeEnv: string;
  appBase: string;
}

// Setup service interface
export interface ISetupService {
  // Username validation and availability
  validateUsername(username: string): Promise<UsernameValidationResult>;
  checkUsernameAvailability(username: string): Promise<UsernameValidationResult>;
  claimUsername(userId: string, username: string): Promise<UsernameClaimResult>;
  
  // Environment management
  setEnvironment(env: any): void;
}

// Setup controller interface
export interface ISetupController {
  // Username endpoints
  checkUsername(c: Context): Promise<Response>;
  claimUsername(c: Context): Promise<Response>;
  
  // Health check
  healthCheck(c: Context): Promise<Response>;
}

// Setup container interface
export interface ISetupContainer {
  getSetupService(): ISetupService;
  getSetupController(): ISetupController;
}
