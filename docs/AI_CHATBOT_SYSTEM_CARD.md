# AI Chatbot Component - System Card

## Overview

The AI Chatbot is a multi-provider, real-time conversational interface built on Convex backend infrastructure. It supports multiple LLM providers (OpenAI, Anthropic, Google, Hugging Face), features vector search capabilities for job/resume matching, and provides streaming responses with persistent chat history.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/TypeScript)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  ChatPage    │  │ ChatComponent│  │ ProcurementChat│      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                 │                 │
│         └─────────────────┼─────────────────┘                 │
│                           │                                   │
│                    Convex React Hooks                         │
│              (useQuery, useMutation, useAction)               │
└───────────────────────────┼───────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Convex Backend (Serverless Functions)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   messages   │  │     chat     │  │  chat (actions)│      │
│  │  (mutations) │  │   (queries)  │  │              │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                 │                 │
│         └─────────────────┼─────────────────┘                 │
│                           │                                   │
│  ┌──────────────────────────────────────────────┐            │
│  │         Node Actions (External APIs)          │            │
│  │  - sendOpenAIMessageWithKey                    │            │
│  │  - sendAnthropicMessageWithKey                  │            │
│  │  - sendGeminiMessageWithKey                     │            │
│  └──────────────────────────────────────────────┘            │
│                           │                                   │
│  ┌──────────────────────────────────────────────┐            │
│  │         Vector Search Services                │            │
│  │  - convexVectorSearch                         │            │
│  │  - embeddingService                           │            │
│  └──────────────────────────────────────────────┘            │
└───────────────────────────┼───────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Convex Database (Real-time)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │    chats     │  │   messages   │  │  jobpostings │        │
│  │              │  │              │  │  resumes      │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### Frontend Components

#### 1. ChatPage (`src/pages/ChatPage.tsx`)
**Primary chat interface component**

**Responsibilities:**
- Main UI for chat conversations
- Manages chat state (messages, input, settings)
- Handles multi-provider model selection
- Integrates vector search functionality
- Real-time message updates via Convex queries
- Settings panel with resizable UI

**Key Features:**
- Dynamic model fetching per provider
- API key management (user-provided)
- Vector search toggle (jobs/resumes/both)
- Code syntax highlighting in responses
- Auto-scrolling message view
- Streaming response indicators

**State Management:**
- `localMessages`: Local message state for immediate UI updates
- `selectedProvider`: Current LLM provider (anthropic, openai, google, huggingface)
- `selectedModelId`: Selected model from provider
- `dynamicModels`: Fetched models per provider
- `enableVectorSearch`: Toggle for vector search feature
- `vectorSearchType`: Search scope (jobs/resumes/both)

**Data Flow:**
1. User submits message → `handleSubmit`
2. If vector search enabled → calls `sendMessageWithVectorSearch` action
3. Otherwise → calls `sendMessage` mutation
4. Messages sync via `useQuery(api.messages.list)`
5. Real-time updates through Convex reactive queries

#### 2. ChatComponent (`src/components/ChatComponent.tsx`)
**Legacy chat component**

**Responsibilities:**
- Legacy chat interface
- Currently being phased out in favor of Convex-based chat

#### 3. Chat (`src/components/Chat.tsx`)
**Simple chat component with streaming**

**Responsibilities:**
- Basic chat interface
- Server-Sent Events (SSE) streaming
- Uses `/api/chat` endpoint for streaming responses

### Backend Components

#### 1. Messages (`convex/messages.ts`)
**Core message handling**

**Exports:**
- `list`: Query messages for a chat (with user ownership check)
- `send`: Mutation to send user message and trigger AI response
- `updateStreamingMessage`: Internal mutation for streaming updates
- `generateAIResponse`: Internal action that calls LLM APIs

**Message Flow:**
1. User sends message via `send` mutation
2. User message inserted into database
3. Empty assistant message created (for streaming)
4. `generateAIResponse` scheduled via `ctx.scheduler`
5. Action determines provider from modelId
6. Calls appropriate Node action (OpenAI/Anthropic/Google)
7. Updates message content incrementally via `updateStreamingMessage`

**Provider Detection:**
- `gpt-*`, `o1-*`, `o2-*`, `o3-*` → OpenAI
- `claude-*` → Anthropic
- `gemini-*` → Google
- Default → Hugging Face (mock)

#### 2. Chat Actions (`convex/chat.ts`)
**Chat-related actions and model management**

**Exports:**
- `sendMessageWithVectorSearch`: Action for enhanced chat with vector search
- `fetchModelsForProvider`: Action to dynamically fetch available models

**Model Fetching:**
- `fetchOpenAIModels`: Fetches from OpenAI API `/v1/models`
- `fetchAnthropicModels`: Fetches from Anthropic API `/v1/models`
- `fetchGoogleModels`: Fetches from Google AI API `/v1beta/models`
- `fetchHuggingFaceModels`: Fetches from Hugging Face API

**Provider-Specific Endpoints:**
- OpenAI: `https://api.openai.com/v1/models`
- Anthropic: `https://api.anthropic.com/v1/models`
- Google: `https://generativelanguage.googleapis.com/v1beta/models`
- Hugging Face: `https://huggingface.co/api/models`

#### 3. Chats (`convex/chats.ts`)
**Chat session management**

**Exports:**
- `list`: Query user's chats (filtered by archived status)
- `get`: Query specific chat by ID
- `create`: Mutation to create new chat
- `updateTitle`: Mutation to update chat title
- `archive`: Mutation to archive chat

#### 4. Node Actions (`convex/nodeActions.ts`)
**External API integrations (runs in Node.js environment)**

**Key Functions:**
- `sendOpenAIMessageWithKey`: OpenAI chat completion
- `sendAnthropicMessageWithKey`: Anthropic message API
- `sendGeminiMessageWithKey`: Google Gemini API
- `enhancedChatCompletion`: Unified interface for all providers

**Token Limits:**
- OpenAI GPT-4: 4096 tokens
- OpenAI GPT-4 Turbo: 128,000 tokens
- Anthropic Claude: 200,000 tokens
- Google Gemini: 30,720 tokens

#### 5. Vector Search (`convex/convexVectorSearch.ts`)
**Semantic search capabilities**

**Exports:**
- `searchJobsByVector`: Query jobs using vector similarity
- `searchResumesByVector`: Query resumes using vector similarity
- `hybridJobSearch`: Combined vector + traditional filters
- `hybridResumeSearch`: Combined vector + traditional filters
- `aiAgentSearch`: High-level semantic search action
- `updateJobEmbedding`: Mutation to update job embeddings
- `updateResumeEmbedding`: Mutation to update resume embeddings

**Current State:**
- Uses text-based search (vector search requires pre-computed embeddings)
- Supports filtering by location, department, job type, skills
- Embeddings stored as `array(v.float64())` in schema

#### 6. Embedding Service (`convex/embeddingService.ts`)
**Embedding generation**

**Exports:**
- `generateEmbedding`: Action to generate embeddings using OpenAI
- `calculateCosineSimilarity`: Action to compute vector similarity

**Models:**
- Default: `text-embedding-3-small` (1536 dimensions)
- Alternatives: `text-embedding-3-large`, `text-embedding-ada-002`

#### 7. Procurement Chat (`convex/procurementChat.ts`)
**Specialized procurement link search**

**Exports:**
- `fetchProcurementLinks`: Action to fetch procurement links via AI
- `fetchAndSaveProcurementLinks`: Action with session persistence

**Features:**
- Uses OpenAI GPT-5-mini model
- JSON-structured responses
- Thread-based conversation management
- Analytics tracking

### API Routes

#### `/api/chat` (`src/pages/api/chat.ts`)
**Server-Sent Events streaming endpoint**

**Flow:**
1. Receives POST with messages array
2. Calls OpenAI API with streaming enabled
3. Streams response chunks via SSE
4. Formats as `data: {delta: "..."}` events
5. Sends `data: {}` when complete

**Note:** This is a legacy endpoint, newer implementation uses Convex actions.

## Data Models

### Chat Schema
```typescript
{
  userId: string,           // Clerk user ID
  title: string,
  modelId: string,          // Dynamic model ID (not foreign key)
  isArchived?: boolean,
  createdAt: number,
  updatedAt: number,
  lastMessageAt?: number
}
```

**Indexes:**
- `by_user`: User's chats
- `by_user_archived`: Filtered by archived status
- `by_last_message`: Sort by recent activity

### Message Schema
```typescript
{
  chatId: Id<"chats">,
  content: string,
  role: "user" | "assistant",
  userId?: string,          // Clerk user ID (null for AI)
  createdAt: number,
  updatedAt: number,
  isStreaming?: boolean,
  error?: string
}
```

**Indexes:**
- `by_chat`: Messages per chat
- `by_creation`: Chronological sorting

### Job Posting Schema (Vector Search)
```typescript
{
  // ... job fields ...
  searchableText?: string,
  extractedSkills?: string[],
  embedding?: number[],      // Vector embedding
  embeddingModel?: string,
  embeddingGeneratedAt?: number,
  // ... metadata ...
}
```

**Indexes:**
- `by_embedding`: Vector similarity search
- `by_location`, `by_department`: Traditional filters

### Resume Schema (Vector Search)
```typescript
{
  // ... resume fields ...
  searchableText?: string,
  extractedSkills?: string[],
  embedding?: number[],      // Vector embedding
  embeddingModel?: string,
  embeddingGeneratedAt?: number,
  // ... metadata ...
}
```

## Data Flow

### Standard Message Flow

```
1. User types message in ChatPage
   ↓
2. handleSubmit() called
   ↓
3. sendMessage() mutation (convex/messages.ts)
   ↓
4. User message inserted into DB
   ↓
5. Empty assistant message created
   ↓
6. generateAIResponse() scheduled
   ↓
7. Provider determined from modelId
   ↓
8. Node action called (OpenAI/Anthropic/Google)
   ↓
9. Response received
   ↓
10. updateStreamingMessage() updates DB
    ↓
11. Convex reactive query updates frontend
    ↓
12. UI displays message in real-time
```

### Vector Search Flow

```
1. User enables vector search in settings
   ↓
2. User submits message
   ↓
3. sendMessageWithVectorSearch() action called
   ↓
4. (Currently placeholder - vector search client-side)
   ↓
5. LLM called with search context
   ↓
6. Response includes relevant jobs/resumes
   ↓
7. Message saved to chat
```

### Model Fetching Flow

```
1. User enters API key
   ↓
2. User selects provider
   ↓
3. fetchModelsForProvider() action called
   ↓
4. Provider-specific API endpoint called
   ↓
5. Models filtered and formatted
   ↓
6. Models stored in component state
   ↓
7. User selects model from dropdown
```

## Infrastructure

### Convex Backend
- **Real-time Database**: Automatic reactive queries
- **Serverless Functions**: Queries, mutations, actions
- **Node.js Actions**: For external API calls (`"use node"`)
- **Scheduler**: For async operations (`ctx.scheduler`)

### Authentication
- **Clerk Integration**: User authentication
- **User IDs**: Stored as strings (Clerk user IDs)
- **Ownership Checks**: All queries verify user ownership

### External APIs
- **OpenAI**: Chat completions, embeddings
- **Anthropic**: Claude models
- **Google AI**: Gemini models
- **Hugging Face**: Model inference

### Vector Search Infrastructure
- **Embedding Generation**: OpenAI `text-embedding-3-small`
- **Vector Storage**: Convex native vector support (array of floats)
- **Similarity Calculation**: Cosine similarity
- **Indexing**: Vector indexes on `embedding` fields

## Key Features

### 1. Multi-Provider Support
- **Dynamic Model Fetching**: Fetches available models per provider
- **Provider Detection**: Automatic provider detection from model ID
- **API Key Management**: User-provided API keys per provider
- **Unified Interface**: Same interface for all providers

### 2. Real-Time Streaming
- **Reactive Updates**: Convex queries update UI automatically
- **Streaming Messages**: Incremental message updates
- **Loading States**: Visual indicators during generation

### 3. Vector Search Integration
- **Semantic Search**: Find relevant jobs/resumes by meaning
- **Hybrid Search**: Combine vector + traditional filters
- **Configurable Scope**: Jobs only, resumes only, or both

### 4. Chat Management
- **Persistent History**: All messages stored in Convex
- **Chat Sessions**: Multiple concurrent chats
- **Archiving**: Archive old conversations
- **Title Management**: Update chat titles

### 5. Code Formatting
- **Syntax Highlighting**: Code blocks formatted with Prism
- **Markdown Support**: Formatted message content

## Configuration

### Environment Variables
```bash
# Required for embeddings and OpenAI models
OPENAI_API_KEY=sk-...

# Required for Anthropic models
ANTHROPIC_API_KEY=sk-ant-...

# Required for Google models
GOOGLE_AI_API_KEY=...

# Required for Hugging Face models
HUGGING_FACE_API_KEY=...

# Required for OpenRouter models (Google Gemini via OpenRouter)
OPENROUTER_API_KEY=sk-or-v1-...

# Optional: Site identification for OpenRouter rankings
SITE_URL=https://your-app-url.com
SITE_TITLE=My AI Assistant
```

### User Configuration
- **API Keys**: Entered per session in UI
- **Provider Selection**: Dropdown in settings panel
- **Model Selection**: Dynamic dropdown based on provider
- **Vector Search**: Toggle and scope selection

## File Structure

```
convex/
├── chat.ts                    # Chat actions, model fetching
├── chats.ts                   # Chat CRUD operations
├── messages.ts                 # Message handling, AI generation
├── nodeActions.ts             # External API integrations
├── convexVectorSearch.ts      # Vector search queries
├── embeddingService.ts        # Embedding generation
├── procurementChat.ts         # Procurement-specific chat
└── schema.ts                  # Database schema definitions

src/
├── pages/
│   ├── ChatPage.tsx           # Main chat interface
│   └── api/
│       └── chat.ts            # Legacy SSE streaming endpoint
├── components/
│   ├── Chat.tsx               # Simple chat component
│   ├── ChatComponent.tsx      # Legacy chat component
│   └── ProcurementChat.tsx    # Procurement chat UI
└── lib/
    └── mongoChatService.ts    # Legacy chat service (deprecated)
```

## Integration Points

### 1. Authentication
- Uses `getCurrentUserId()` from `convex/auth.ts`
- Clerk user IDs stored as strings
- All queries filter by `userId`

### 2. Vector Search
- Integrates with `jobpostings` and `resumes` tables
- Uses `convexVectorSearch` queries
- Embeddings generated via `embeddingService`

### 3. External LLM APIs
- Called via Node actions (`"use node"`)
- API keys passed from frontend
- Error handling and fallbacks

### 4. Real-Time Updates
- Convex reactive queries (`useQuery`)
- Automatic UI updates on database changes
- Optimistic updates for better UX

## Error Handling

### Message Generation Errors
- Caught in `generateAIResponse` action
- Error message saved to message record
- User sees error in chat UI

### API Errors
- Provider-specific error messages
- Fallback to error state
- API key validation

### Vector Search Errors
- Falls back to regular message sending
- Error logged to console
- User notified via UI

## Performance Considerations

### Streaming
- Messages updated incrementally
- Reduces perceived latency
- Better user experience

### Vector Search
- Embeddings pre-computed (when available)
- Cosine similarity calculation
- Indexed for fast retrieval

### Model Fetching
- Cached in component state
- Refreshable via UI button
- Provider-specific caching

## Future Enhancements

### Planned/In Progress
1. **Full Vector Search**: Complete embedding pipeline
2. **Streaming Improvements**: Better streaming support
3. **Model Caching**: Server-side model caching
4. **Analytics**: Usage tracking and analytics

### Known Limitations
1. Vector search currently uses text-based fallback
2. Hugging Face models return mock responses
3. Some legacy endpoints still in use

## Usage Examples

### Basic Chat
```typescript
// User sends message
await sendMessage({
  chatId: chatId,
  content: "Hello!",
  apiKey: userApiKey,
  modelId: "claude-3-sonnet-20240229"
});
```

### Vector Search Chat
```typescript
// Enhanced chat with vector search
const result = await sendMessageWithVectorSearch({
  message: "Find software engineer jobs",
  modelId: "gpt-4",
  includeVectorSearch: true,
  searchType: "jobs"
});
```

### Model Fetching
```typescript
// Fetch available models
const models = await fetchModelsForProvider({
  provider: "anthropic",
  apiKey: userApiKey
});
```

## Security Considerations

1. **API Keys**: User-provided, not stored server-side
2. **User Ownership**: All queries verify ownership
3. **Input Validation**: Convex schema validation
4. **Error Messages**: Don't expose sensitive info

## Testing

- Unit tests: `convex/messages.test.ts`
- Model tests: `convex/aiModels.test.ts`
- Integration: Manual testing via UI

---

**Last Updated**: Based on current codebase state
**Maintainer**: Development Team
**Documentation Version**: 1.0
