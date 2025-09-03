import type { Context } from "hono";
import type { AppEnv } from "./core/env";

export type AppContext = Context<{ Bindings: AppEnv }>;
