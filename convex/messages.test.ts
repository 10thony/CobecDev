import { test, expect, vi, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { FunctionReference } from "convex/server";

// Mock environment variables
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.ANTHROPIC_API_KEY = "test-anthropic-key";

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock chat and model data
const mockChat = {
  _id: "chat_123" as Id<"chats">,
  userId: "clerk_user_123", // Clerk user ID (string)
  title: "Test Chat",
  modelId: "model_123" as Id<"aiModels">,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockModel = {
  _id: "model_123" as Id<"aiModels">,
  name: "GPT-4",
  provider: "openai",
  modelId: "gpt-4",
  apiKeyEnvVar: "OPENAI_API_KEY",
  isActive: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// Mock messages
const mockMessages = [
  {
    _id: "msg_1" as Id<"messages">,
    chatId: mockChat._id,
    content: "Hello",
    role: "user",
    userId: "clerk_user_123", // Clerk user ID (string)
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

describe("Messages Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should handle missing API key", async () => {
    // Mock database queries
    const mockCtx = {
      db: {
        get: vi.fn().mockResolvedValue(mockChat),
      },
      runQuery: vi.fn()
        .mockResolvedValueOnce({ ...mockChat, model: mockModel })
        .mockResolvedValueOnce(mockMessages),
      runMutation: vi.fn(),
    };

    // Delete API key
    delete process.env.OPENAI_API_KEY;

    // Update the function calls to use proper typing
    const generateResponse = internal.messages.generateAIResponse as unknown as (ctx: any, args: { chatId: Id<"chats">; messageId: Id<"messages">; apiKey: string; }) => Promise<void>;
    await generateResponse(mockCtx, {
      chatId: mockChat._id,
      messageId: "msg_2" as Id<"messages">,
      apiKey: "test-key",
    });

    // Verify error message was set
    expect(mockCtx.runMutation).toHaveBeenCalledWith(
      internal.messages.updateStreamingMessage,
      {
        messageId: "msg_2",
        content: "Sorry, I encountered an error while generating a response.",
      }
    );
  });

  test("should handle API errors", async () => {
    // Mock database queries
    const mockCtx = {
      db: {
        get: vi.fn().mockResolvedValue(mockChat),
      },
      runQuery: vi.fn()
        .mockResolvedValueOnce({ ...mockChat, model: mockModel })
        .mockResolvedValueOnce(mockMessages),
      runMutation: vi.fn(),
    };

    // Mock failed API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: "API Error",
    });

    // Update the function calls to use proper typing
    const generateResponse = internal.messages.generateAIResponse as unknown as (ctx: any, args: { chatId: Id<"chats">; messageId: Id<"messages">; apiKey: string; }) => Promise<void>;
    await generateResponse(mockCtx, {
      chatId: mockChat._id,
      messageId: "msg_2" as Id<"messages">,
      apiKey: "test-key",
    });

    // Verify error message was set
    expect(mockCtx.runMutation).toHaveBeenCalledWith(
      internal.messages.updateStreamingMessage,
      {
        messageId: "msg_2",
        content: "Sorry, I encountered an error while generating a response.",
      }
    );
  });

  test("should handle successful API response", async () => {
    // Mock database queries
    const mockCtx = {
      db: {
        get: vi.fn().mockResolvedValue(mockChat),
      },
      runQuery: vi.fn()
        .mockResolvedValueOnce({ ...mockChat, model: mockModel })
        .mockResolvedValueOnce(mockMessages),
      runMutation: vi.fn(),
    };

    // Mock successful API response
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => ({
          read: () => Promise.resolve({
            done: true,
            value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n'),
          }),
        }),
      },
    };
    (global.fetch as any).mockResolvedValueOnce(mockResponse);

    // Update the function calls to use proper typing
    const generateResponse = internal.messages.generateAIResponse as unknown as (ctx: any, args: { chatId: Id<"chats">; messageId: Id<"messages">; apiKey: string; }) => Promise<void>;
    await generateResponse(mockCtx, {
      chatId: mockChat._id,
      messageId: "msg_2" as Id<"messages">,
      apiKey: "test-key",
    });

    // Verify message was updated with content
    expect(mockCtx.runMutation).toHaveBeenCalledWith(
      internal.messages.updateStreamingMessage,
      {
        messageId: "msg_2",
        content: "Hello",
      }
    );
  });

  test("should handle unsupported provider", async () => {
    // Mock database queries with unsupported provider
    const mockCtx = {
      db: {
        get: vi.fn().mockResolvedValue(mockChat),
      },
      runQuery: vi.fn()
        .mockResolvedValueOnce({
          ...mockChat,
          model: { ...mockModel, provider: "unsupported" },
        })
        .mockResolvedValueOnce(mockMessages),
      runMutation: vi.fn(),
    };

    // Update the function calls to use proper typing
    const generateResponse = internal.messages.generateAIResponse as unknown as (ctx: any, args: { chatId: Id<"chats">; messageId: Id<"messages">; apiKey: string; }) => Promise<void>;
    await generateResponse(mockCtx, {
      chatId: mockChat._id,
      messageId: "msg_2" as Id<"messages">,
      apiKey: "test-key",
    });

    // Verify error message was set
    expect(mockCtx.runMutation).toHaveBeenCalledWith(
      internal.messages.updateStreamingMessage,
      {
        messageId: "msg_2",
        content: "Sorry, I encountered an error while generating a response.",
      }
    );
  });
}); 