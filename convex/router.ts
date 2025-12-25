"use node";

import * as chats from "./chats";
import * as messages from "./messages";
import * as aiModels from "./aiModels";
import * as userRoles from "./userRoles";
import * as cobecAdmins from "./cobecAdmins";
import * as nominations from "./nominations";
import * as employees from "./employees";
import * as kfcData from "./kfcData";
import * as jobPostings from "./jobPostings";
import * as resumes from "./resumes";
import * as dataManagement from "./dataManagement";
import * as migrationInsertions from "./migrationInsertions";
import * as logs from "./logs";
import * as auth from "./auth";
import * as openai from "./openai";
import * as nodeActions from "./nodeActions";
import * as vectorSearch from "./vectorSearch";
import * as convexVectorSearch from "./convexVectorSearch";
import * as semanticQuestions from "./semanticQuestions";
import * as semanticEmbeddingService from "./semanticEmbeddingService";
import * as semanticEmbeddingMutations from "./semanticEmbeddingMutations";
import * as embeddingService from "./embeddingService";
import * as favorites from "./favorites";
import * as procurementChat from "./procurementChat";
import * as procurementUrls from "./procurementUrls";
import * as agent from "./agent/procurementVerifier";

// Export all functions as a single API object
export default {
  chats,
  messages,
  aiModels,
  userRoles,
  cobecAdmins,
  nominations,
  employees,
  kfcData,
  jobPostings,
  resumes,
  dataManagement,
  migrationInsertions,
  logs,
  auth,
  openai,
  nodeActions,
  vectorSearch,
  convexVectorSearch,
  semanticQuestions,
  semanticEmbeddingService,
  semanticEmbeddingMutations,
  embeddingService,
  favorites,
  procurementChat,
  procurementUrls,
  agent,
};
