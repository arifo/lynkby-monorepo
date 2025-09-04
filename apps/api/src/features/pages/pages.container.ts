import type { AppEnv } from "../../core/env";
import type { IPagesController } from "./pages.interfaces";
import { PagesController } from "./pages.controller";
import { pagesService } from "./pages.service";

export function getPagesController(env?: AppEnv): IPagesController {
  if (env) pagesService.setEnvironment(env);
  const controller = new PagesController(pagesService, {});
  return controller;
}

