import { userRepository } from "../../core/repositories";
import { logger } from "../../core/util/logger";
import { createError } from "../../core/errors";
import { 
  UsernameValidationResult, 
  UsernameClaimResult, 
  USERNAME_RULES, 
  USERNAME_ERRORS 
} from "./setup.types";
import { BaseService } from "../../core/services/base.service";
import type { AppEnv } from "../../core/env";
import type { ISetupService } from "./setup.interfaces";

export class SetupService extends BaseService implements ISetupService {
  
  // Validate username format and rules
  async validateUsername(username: string): Promise<UsernameValidationResult> {
    // Check if username is empty
    if (!username || username.trim().length === 0) {
      return {
        isValid: false,
        isAvailable: false,
        reason: USERNAME_ERRORS.EMPTY
      };
    }

    // Check minimum length
    if (username.length < USERNAME_RULES.MIN_LENGTH) {
      return {
        isValid: false,
        isAvailable: false,
        reason: USERNAME_ERRORS.TOO_SHORT
      };
    }

    // Check maximum length
    if (username.length > USERNAME_RULES.MAX_LENGTH) {
      return {
        isValid: false,
        isAvailable: false,
        reason: USERNAME_ERRORS.TOO_LONG
      };
    }

    // Check allowed characters
    if (!USERNAME_RULES.ALLOWED_CHARS.test(username)) {
      return {
        isValid: false,
        isAvailable: false,
        reason: USERNAME_ERRORS.INVALID_CHARS
      };
    }

    // Check reserved words
    if (USERNAME_RULES.RESERVED_WORDS.has(username.toLowerCase())) {
      return {
        isValid: false,
        isAvailable: false,
        reason: USERNAME_ERRORS.RESERVED_WORD
      };
    }

    return {
      isValid: true,
      isAvailable: false, // Will be determined by database check
    };
  }

  // Check if username is available in the database
  async checkUsernameAvailability(username: string): Promise<UsernameValidationResult> {
    // First validate the format
    const validation = await this.validateUsername(username);
    
    if (!validation.isValid) {
      return validation;
    }

    // Check if username is already taken
    const existingUser = await userRepository.findByUsername(username.toLowerCase());
    
    if (existingUser) {
      return {
        isValid: true,
        isAvailable: false,
        reason: USERNAME_ERRORS.ALREADY_TAKEN
      };
    }

    return {
      isValid: true,
      isAvailable: true,
    };
  }

  // Claim username for a user
  async claimUsername(userId: string, username: string): Promise<UsernameClaimResult> {
    try {
      // First check availability
      const availability = await this.checkUsernameAvailability(username);
      
      if (!availability.isValid || !availability.isAvailable) {
        return {
          success: false,
          error: availability.reason || USERNAME_ERRORS.INVALID_FORMAT
        };
      }

      // Update user with the new username
      const updatedUser = await userRepository.update(userId, { 
        username: username.toLowerCase() 
      });

      // Log the username claim
      logger.info("Username claimed successfully", { 
        userId, 
        username: username.toLowerCase() 
      });

      return {
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username || username.toLowerCase(),
        }
      };

    } catch (error) {
      logger.error("Failed to claim username", { 
        userId, 
        username, 
        error: error instanceof Error ? error.message : String(error) 
      });

      // Handle specific database errors
      if (error instanceof Error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          return {
            success: false,
            error: USERNAME_ERRORS.ALREADY_TAKEN
          };
        }
      }

      return {
        success: false,
        error: "Failed to claim username. Please try again."
      };
    }
  }
}

// Export singleton instance
export const setupService = new SetupService();
