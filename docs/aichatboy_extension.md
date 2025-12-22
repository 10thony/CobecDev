# AI Chatbot Component - System Card (OpenRouter Expansion)

## Overview
This updated system card details the architectural expansion of the AI Chatbot to support **Google models via OpenRouter**. This integration provides a unified interface for frontier Google models (Gemini series) with built-in fallbacks, side-by-side pricing, and resilient routing.

## High-Level Architecture (Updated)

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/TypeScript)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  ChatPage    │  │ ModelSelector│  │ OpenRouterSet│      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                 │                 │
│         └─────────────────┼─────────────────┘                 │
│                           ▼                                   │
│                    Convex React Hooks                         │
└───────────────────────────┼───────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Convex Backend (Serverless Functions)            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │             Unified Node Action Provider               │  │
│  │  - sendOpenRouterMessage (New)                         │  │
│  │  - fetchOpenRouterModels (New)                         │  │
│  └──────────────┬───────────────────────────┬─────────────┘  │
│                 │                           │                 │
│                 ▼                           ▼                 │
│        ┌──────────────────┐        ┌──────────────────┐      │
│        │ OpenRouter API   │        │ Native Providers │      │
│        │ (v1/chat/compl)  │        │ (OpenAI/Anthropic)│      │
│        └────────┬─────────┘        └──────────────────┘      │
└─────────────────┼─────────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              OpenRouter Gateway (External)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Google Gemini│  │ Anthropic    │  │ Meta Llama   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Core Components (Expanded)

### Backend Components

#### 1. OpenRouter Integration (`convex/nodeActions.ts`)
**Unified interface for Google and multi-provider models.**

**New Functions:**
- `sendOpenRouterMessage`: Communicates with `https://openrouter.ai/api/v1/chat/completions`.
- Supports specific OpenRouter features:
  - **Assistant Prefill**: Guides Google models by providing partial responses.
  - **Provider Routing**: Uses `:nitro` (speed) or `:floor` (price) suffixes for Google models.
  - **Site Identification**: Includes `HTTP-Referer` and `X-Title` headers for OpenRouter rankings.

#### 2. Model Fetching (`convex/chat.ts`)
**Dynamic discovery of OpenRouter models.**

**New Logic:**
- `fetchOpenRouterModels`: Hits `https://openrouter.ai/api/v1/models`.
- Maps OpenRouter response schema (standardized OpenAI-compatible) to internal `dynamicModels` state.
- **Model Filtering**: Specifically identifies `google/gemini-*` slugs for targeted Google model selection.

### Frontend Enhancements

#### 1. Model Selector (`src/pages/ChatPage.tsx`)
- **New Provider Option**: "OpenRouter" added to `selectedProvider`.
- **Model Mapping**: When "OpenRouter" is selected, the model list populates with IDs like `google/gemini-2.0-flash-001`.
- **UI Logic**: Displays pricing information fetched from OpenRouter's metadata (`pricing.prompt`, `pricing.completion`).

## Data Flow (OpenRouter Path)

```
1. User selects "OpenRouter" provider + "google/gemini-pro"
   ↓
2. handleSubmit() calls sendMessage() with OpenRouter flag
   ↓
3. sendOpenRouterMessage() Node Action called
   ↓
4. Request headers sent with site metadata:
   {
     "Authorization": "Bearer <<OPENROUTER_API_KEY>>",
     "HTTP-Referer": "https://your-app-url.com",
     "X-Title": "My AI Assistant"
   }
   ↓
5. OpenRouter routes to Google (with optional fallbacks)
   ↓
6. Incremental chunks update Convex DB via updateStreamingMessage
   ↓
7. Frontend displays Google model response in real-time
```

## Data Models (Updated Schema)

### Chat Schema
```typescript
{
  // ... existing fields ...
  provider: "openai" | "anthropic" | "google" | "openrouter", // Expanded
  openrouterMetadata?: {
    totalCost: number,
    latency: number
  }
}
```

## Key OpenRouter Features Integrated
1. **Model Fallbacks**: Configurable in `extra_body` to fall back from Google models to Llama or Claude if rate limits are hit.
2. **Unified JSON Schema**: All Google models via OpenRouter use the standard OpenAI-compatible response format, simplifying the frontend parsing logic.
3. **Prompt Caching**: Manual toggle provided specifically for Gemini models to activate caching (per OpenRouter recommendations).

## Configuration

### Environment Variables
```bash
# New key for OpenRouter
OPENROUTER_API_KEY=sk-or-v1-...
```

### Routing Logic
The backend determines the endpoint based on the `modelId`:
- `google/*` or `openrouter/*` → Routes to OpenRouter Node Action.
- `gpt-*` → Routes to Native OpenAI Action (or OpenRouter if configured as fallback).

## Performance & Security
- **Latency Optimization**: Use of the `:nitro` variant for critical procurement searches.
- **Credit Management**: Usage information is extracted from the `usage` field in the OpenRouter response and persisted for user analytics.
- **Key Safety**: OpenRouter API keys are handled with the same "no-persist" security protocol as other provider keys.

---
**Last Updated**: 12/22/2025
**Version**: 1.1 (Google/OpenRouter Support)