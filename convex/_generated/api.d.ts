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
import type * as favorites from "../favorites.js";
import type * as http from "../http.js";
import type * as jobPostings from "../jobPostings.js";
import type * as kfcData from "../kfcData.js";
import type * as leads from "../leads.js";
import type * as leadsActions from "../leadsActions.js";
import type * as links from "../links.js";
import type * as logs from "../logs.js";
import type * as messages from "../messages.js";
import type * as migrationInsertions from "../migrationInsertions.js";
import type * as migrations from "../migrations.js";
import type * as mongoSearch from "../mongoSearch.js";
import type * as nativeVectorSearch from "../nativeVectorSearch.js";
import type * as nodeActions from "../nodeActions.js";
import type * as nominations from "../nominations.js";
import type * as openai from "../openai.js";
import type * as opportunities from "../opportunities.js";
import type * as opportunitiesActions from "../opportunitiesActions.js";
import type * as procurementChat from "../procurementChat.js";
import type * as procurementChatMessages from "../procurementChatMessages.js";
import type * as procurementChatSessions from "../procurementChatSessions.js";
import type * as procurementUrls from "../procurementUrls.js";
import type * as resumeEmbeddingPipeline from "../resumeEmbeddingPipeline.js";
import type * as resumes from "../resumes.js";
import type * as resumesActions from "../resumesActions.js";
import type * as router from "../router.js";
import type * as seedSemanticQuestions from "../seedSemanticQuestions.js";
import type * as seedVectorSearchPrompts from "../seedVectorSearchPrompts.js";
import type * as semanticEmbeddingMutations from "../semanticEmbeddingMutations.js";
import type * as semanticEmbeddingQueries from "../semanticEmbeddingQueries.js";
import type * as semanticEmbeddingService from "../semanticEmbeddingService.js";
import type * as semanticQuestions from "../semanticQuestions.js";
import type * as userRoles from "../userRoles.js";
import type * as vectorEmbeddingQueries from "../vectorEmbeddingQueries.js";
import type * as vectorEmbeddingService from "../vectorEmbeddingService.js";
import type * as vectorSearch from "../vectorSearch.js";
import type * as vectorSearchHelpers from "../vectorSearchHelpers.js";
import type * as vectorSearchPrompts from "../vectorSearchPrompts.js";

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
  favorites: typeof favorites;
  http: typeof http;
  jobPostings: typeof jobPostings;
  kfcData: typeof kfcData;
  leads: typeof leads;
  leadsActions: typeof leadsActions;
  links: typeof links;
  logs: typeof logs;
  messages: typeof messages;
  migrationInsertions: typeof migrationInsertions;
  migrations: typeof migrations;
  mongoSearch: typeof mongoSearch;
  nativeVectorSearch: typeof nativeVectorSearch;
  nodeActions: typeof nodeActions;
  nominations: typeof nominations;
  openai: typeof openai;
  opportunities: typeof opportunities;
  opportunitiesActions: typeof opportunitiesActions;
  procurementChat: typeof procurementChat;
  procurementChatMessages: typeof procurementChatMessages;
  procurementChatSessions: typeof procurementChatSessions;
  procurementUrls: typeof procurementUrls;
  resumeEmbeddingPipeline: typeof resumeEmbeddingPipeline;
  resumes: typeof resumes;
  resumesActions: typeof resumesActions;
  router: typeof router;
  seedSemanticQuestions: typeof seedSemanticQuestions;
  seedVectorSearchPrompts: typeof seedVectorSearchPrompts;
  semanticEmbeddingMutations: typeof semanticEmbeddingMutations;
  semanticEmbeddingQueries: typeof semanticEmbeddingQueries;
  semanticEmbeddingService: typeof semanticEmbeddingService;
  semanticQuestions: typeof semanticQuestions;
  userRoles: typeof userRoles;
  vectorEmbeddingQueries: typeof vectorEmbeddingQueries;
  vectorEmbeddingService: typeof vectorEmbeddingService;
  vectorSearch: typeof vectorSearch;
  vectorSearchHelpers: typeof vectorSearchHelpers;
  vectorSearchPrompts: typeof vectorSearchPrompts;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
