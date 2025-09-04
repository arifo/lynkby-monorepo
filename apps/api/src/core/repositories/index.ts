// Export all repositories
// Re-export repository instances and classes
export { userRepository, UserRepository } from './user.repository';
export { pageRepository, PageRepository } from './page.repository';
export { authRepository, AuthRepository } from './auth.repository';
export { loginRequestRepository, LoginRequestRepository } from './login-request.repository';

// Re-export types from shared package
export type { 
  User, 
  CreateUserData, 
  UpdateUserData,
  Page, 
  CreatePageData, 
  UpdatePageData, 
  PageWithLinks, 
  Link,
  MagicLinkToken, 
  UserSession, 
  CreateMagicLinkTokenData, 
  CreateUserSessionData, 
  UpdateSessionData
} from '@lynkby/shared';

// Export database service
export { databaseService, type DatabaseService } from '../services/database.service';
