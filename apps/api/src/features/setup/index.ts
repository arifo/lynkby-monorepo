// Export setup feature components
export { setupService } from "./setup.service";
export { SetupController } from "./setup.controller";
export { SetupContainer, createSetupContainer, getSetupController } from "./setup.container";

// Export types and interfaces
export type { 
  ISetupService, 
  ISetupController, 
  ISetupContainer, 
  SetupModuleConfig 
} from "./setup.interfaces";

export type { 
  UsernameValidationResult, 
  UsernameClaimResult 
} from "./setup.types";

// Export schemas
export { 
  CheckUsernameRequestSchema,
  ClaimUsernameRequestSchema,
  UsernameAvailabilityResponseSchema,
  UsernameClaimResponseSchema,
  SetupErrorResponseSchema,
  type CheckUsernameRequest,
  type ClaimUsernameRequest,
  type UsernameAvailabilityResponse,
  type UsernameClaimResponse,
  type SetupErrorResponse
} from "./setup.schemas";
