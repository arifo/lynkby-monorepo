import { pageRepository, userRepository } from "../../core/repositories";
import { logger } from "../../core/util/logger";
import { createError } from "../../core/errors";
import { 
  UsernameValidationResult,
  UsernameClaimResult,
  USERNAME_RULES,
  USERNAME_ERRORS,
  SetupState
} from '@lynkby/shared';
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

  // Create a default page with sample links if the user has none (idempotent)
  async createDefaultPageIfMissing(userId: string): Promise<{
    created: boolean;
    pageId: string;
    username?: string;
  }> {
    pageRepository.setEnvironment(this.getEnv());
    userRepository.setEnvironment(this.getEnv());

    // Check existing
    const existing = await pageRepository.findByUserId(userId);
    if (existing) {
      const user = await userRepository.findById(userId);
      return { created: false, pageId: existing.id, username: user?.username || undefined };
    }

    // Build defaults
    const user = await userRepository.findById(userId);
    const username = user?.username || undefined;
    const displayName = username || (user?.email?.split("@")[0] ?? "My Lynkby");

    // Update user with display name if not set
    if (!user?.displayName) {
      await userRepository.update(userId, { displayName });
    }

    // Create page
    const page = await pageRepository.create({ userId });
    logger.info("Default page created", { userId, pageId: page.id });

    // Insert two default links
    await pageRepository.insertLinks(page.id, [
      { title: "👋 Welcome to my Lynkby", url: "https://lynkby.com", position: 0 },
      { title: "💡 Example link", url: "https://example.com", position: 1 },
    ]);
    logger.info("Default links inserted", { pageId: page.id });

    return { created: true, pageId: page.id, username };
  }

  async markFirstSaveCompleted(userId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const setupState = await this.getOrCreateSetupState(userId);
      await this.updateSetupState(userId, { firstSaveCompleted: true });
      logger.logAPI("FIRST_SAVE_COMPLETED", `user:${userId}`, { userId });
      return { ok: true };
    } catch (error) {
      logger.error("markFirstSaveCompleted: Failed to mark first save completed", { userId, error });
      return { ok: false, error: "Failed to mark first save completed" };
    }
  }

  async updateChecklistItem(userId: string, key: string, done: boolean): Promise<{ ok: boolean; checklist?: SetupState['checklist']; error?: string }> {
    try {
      const setupState = await this.getOrCreateSetupState(userId);
      const updatedChecklist = {
        ...setupState.checklist,
        [key]: {
          done,
          ts: done ? new Date().toISOString() : null
        }
      };
      
      await this.updateSetupState(userId, { checklist: updatedChecklist });
      logger.logAPI("CHECKLIST_UPDATED", `user:${userId}`, { userId, key, done });
      return { ok: true, checklist: updatedChecklist };
    } catch (error) {
      logger.error("updateChecklistItem: Failed to update checklist item", { userId, key, done, error });
      return { ok: false, error: "Failed to update checklist item" };
    }
  }

  async getOrCreateSetupState(userId: string): Promise<SetupState> {
    // This would need to be implemented with a setup state repository
    // For now, return a default state
    const now = new Date();
    return {
      id: `temp-${userId}`,
      userId,
      firstSaveCompleted: false,
      checklist: {
        displayNameAvatar: { done: false, ts: null },
        addLinks3Plus: { done: false, ts: null },
        chooseTheme: { done: false, ts: null },
        addBio: { done: false, ts: null },
        copyLinkToTikTok: { done: false, ts: null }
      },
      createdAt: now,
      updatedAt: now
    };
  }

  private async updateSetupState(userId: string, updates: Partial<SetupState>): Promise<void> {
    // This would need to be implemented with a setup state repository
    // For now, just log the update
    logger.info("Setup state updated", { userId, updates });
  }

  autoCheckChecklistItems(data: {
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    linksCount: number;
    theme: string;
  }, currentChecklist: SetupState['checklist']): SetupState['checklist'] {
    return {
      displayNameAvatar: {
        done: currentChecklist.displayNameAvatar?.done || !!(data.displayName || data.avatarUrl),
        ts: currentChecklist.displayNameAvatar?.ts || null
      },
      addLinks3Plus: {
        done: currentChecklist.addLinks3Plus?.done || data.linksCount >= 3,
        ts: currentChecklist.addLinks3Plus?.ts || null
      },
      chooseTheme: {
        done: currentChecklist.chooseTheme?.done || data.theme !== "classic",
        ts: currentChecklist.chooseTheme?.ts || null
      },
      addBio: {
        done: currentChecklist.addBio?.done || !!(data.bio && data.bio.length >= 20),
        ts: currentChecklist.addBio?.ts || null
      },
      copyLinkToTikTok: {
        done: currentChecklist.copyLinkToTikTok?.done || false,
        ts: currentChecklist.copyLinkToTikTok?.ts || null
      }
    };
  }
}

// Export singleton instance
export const setupService = new SetupService();
