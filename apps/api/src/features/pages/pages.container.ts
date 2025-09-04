import type { AppEnv } from "../../core/env";
import type { IPagesController } from "./pages.interfaces";
import { PagesController } from "./pages.controller";
import { pagesService } from "./pages.service";
import { setupService } from "../setup/setup.service";

export function getPagesController(env?: AppEnv): IPagesController {
  if (env) pagesService.setEnvironment(env);
  const controller = new PagesController(pagesService, setupService, {});
  return controller;
}

