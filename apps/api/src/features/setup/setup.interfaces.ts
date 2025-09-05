import type { Context } from "hono";
import type { 
  UsernameValidationResult, 
  UsernameClaimResult,
  SetupState 
} from '@lynkby/shared';

// Setup module configuration
export interface SetupModuleConfig {
  nodeEnv: string;
  appBase: string;
  jwtSecret: string;
}

// Setup service interface
export interface ISetupService {
  // Username validation and availability
  validateUsername(username: string): Promise<UsernameValidationResult>;
  checkUsernameAvailability(username: string): Promise<UsernameValidationResult>;
  claimUsername(userId: string, username: string): Promise<UsernameClaimResult>;
  createDefaultPageIfMissing(userId: string): Promise<{ created: boolean; pageId: string; username?: string }>;
  markFirstSaveCompleted(userId: string): Promise<{ ok: boolean; error?: string }>;
  updateChecklistItem(userId: string, key: string, done: boolean): Promise<{ ok: boolean; checklist?: SetupState['checklist']; error?: string }>;
  getOrCreateSetupState(userId: string): Promise<SetupState>;
  autoCheckChecklistItems(data: { displayName?: string; avatarUrl?: string; bio?: string; linksCount: number; theme: string }, currentChecklist: SetupState['checklist']): SetupState['checklist'];
  // Environment management
  setEnvironment(env: any): void;
}

// Setup controller interface
export interface ISetupController {
  // Username endpoints
  checkUsername(c: Context): Promise<Response>;
  claimUsername(c: Context): Promise<Response>;
  setupDefaultPage(c: Context): Promise<Response>;
  markFirstSaveCompleted(c: any): Promise<Response>;
  updateChecklistItem(c: any): Promise<Response>;  
  // Health check
  healthCheck(c: Context): Promise<Response>;
}

// Setup container interface
export interface ISetupContainer {
  getSetupService(): ISetupService;
  getSetupController(): ISetupController;
}
