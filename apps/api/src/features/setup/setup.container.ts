import type { AppEnv } from "../../core/env";
import { setupService } from "./setup.service";
import { SetupController } from "./setup.controller";
import type { ISetupService, ISetupController, ISetupContainer, SetupModuleConfig } from "./setup.interfaces";

// Setup container class
export class SetupContainer implements ISetupContainer {
  private readonly setupService: ISetupService;
  private readonly setupController: ISetupController;

  constructor(config: SetupModuleConfig) {
    this.setupService = setupService;
    this.setupController = new SetupController(this.setupService, config);
  }

  getSetupService(): ISetupService {
    return this.setupService;
  }

  getSetupController(): ISetupController {
    return this.setupController;
  }
}

// Factory function to create setup container
export function createSetupContainer(env: AppEnv): SetupContainer {
  const config: SetupModuleConfig = {
    nodeEnv: env.NODE_ENV,
    appBase: env.APP_BASE,
  };

  return new SetupContainer(config);
}

// Factory function to get setup controller
export function getSetupController(env: AppEnv): ISetupController {
  const container = createSetupContainer(env);
  return container.getSetupController();
}
