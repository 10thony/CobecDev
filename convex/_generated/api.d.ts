/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as aiModels from "../aiModels.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as chats from "../chats.js";
import type * as http from "../http.js";
import type * as logs from "../logs.js";
import type * as messages from "../messages.js";
import type * as mongoSearch from "../mongoSearch.js";
import type * as nodeActions from "../nodeActions.js";
import type * as openai from "../openai.js";
import type * as router from "../router.js";
import type * as userRoles from "../userRoles.js";
import type * as vectorSearch from "../vectorSearch.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  aiModels: typeof aiModels;
  auth: typeof auth;
  chat: typeof chat;
  chats: typeof chats;
  http: typeof http;
  logs: typeof logs;
  messages: typeof messages;
  mongoSearch: typeof mongoSearch;
  nodeActions: typeof nodeActions;
  openai: typeof openai;
  router: typeof router;
  userRoles: typeof userRoles;
  vectorSearch: typeof vectorSearch;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
