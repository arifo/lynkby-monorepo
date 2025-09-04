import type { AppEnv } from "../../core/env";
import type { 
  IPagesService as SharedIPagesService,
  IPagesController as SharedIPagesController,
  PublicPageJSON
} from '@lynkby/shared';

export interface IPagesService extends SharedIPagesService {
  setEnvironment(env: AppEnv): void;
}

export interface IPagesController extends SharedIPagesController {}

export interface PagesModuleConfig {
  // placeholder for future options (themes, etc.)
}
