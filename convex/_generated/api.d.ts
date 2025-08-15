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
import type * as cobecAdmins from "../cobecAdmins.js";
import type * as convexVectorSearch from "../convexVectorSearch.js";
import type * as dataManagement from "../dataManagement.js";
import type * as dynamicSkillMapping from "../dynamicSkillMapping.js";
import type * as embeddingManagement from "../embeddingManagement.js";
import type * as embeddingService from "../embeddingService.js";
import type * as employees from "../employees.js";
import type * as enhancedEmbeddingService from "../enhancedEmbeddingService.js";
import type * as http from "../http.js";
import type * as jobPostings from "../jobPostings.js";
import type * as kfcData from "../kfcData.js";
import type * as logs from "../logs.js";
import type * as messages from "../messages.js";
import type * as migrationInsertions from "../migrationInsertions.js";
import type * as migrations from "../migrations.js";
import type * as mongoSearch from "../mongoSearch.js";
import type * as nodeActions from "../nodeActions.js";
import type * as nominations from "../nominations.js";
import type * as openai from "../openai.js";
import type * as resumes from "../resumes.js";
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
  cobecAdmins: typeof cobecAdmins;
  convexVectorSearch: typeof convexVectorSearch;
  dataManagement: typeof dataManagement;
  dynamicSkillMapping: typeof dynamicSkillMapping;
  embeddingManagement: typeof embeddingManagement;
  embeddingService: typeof embeddingService;
  employees: typeof employees;
  enhancedEmbeddingService: typeof enhancedEmbeddingService;
  http: typeof http;
  jobPostings: typeof jobPostings;
  kfcData: typeof kfcData;
  logs: typeof logs;
  messages: typeof messages;
  migrationInsertions: typeof migrationInsertions;
  migrations: typeof migrations;
  mongoSearch: typeof mongoSearch;
  nodeActions: typeof nodeActions;
  nominations: typeof nominations;
  openai: typeof openai;
  resumes: typeof resumes;
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
