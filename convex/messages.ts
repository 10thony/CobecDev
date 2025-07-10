import { query, mutation, action, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId } from "./auth";
import { api, internal } from "./_generated/api";

// Get messages for a chat
export const list = query({
  args: { chatId: v.id("chats"), userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Use explicit userId if provided, otherwise get from context
    const userId = args.userId ?? await getCurrentUserId(ctx);
    // Verify user owns the chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      return [];
    }
    return await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();
  },
});

// Send a message
export const send = mutation({
  args: {
    chatId: v.id("chats"),
    content: v.string(),
    apiKey: v.string(),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    // Verify user owns the chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }
    // Insert user message
    await ctx.db.insert("messages", {
      chatId: args.chatId,
      content: args.content,
      role: "user",
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    // Create initial AI message for streaming
    const aiMessageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      content: "",
      role: "assistant",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    // Schedule AI response with API key, model ID, and userId
    await ctx.scheduler.runAfter(0, internal.messages.generateAIResponse, {
      chatId: args.chatId,
      messageId: aiMessageId,
      apiKey: args.apiKey,
      modelId: args.modelId,
      userId, // pass userId explicitly
    });
  },
});


// Update streaming message (internal)
export const updateStreamingMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return;
    
    // Append the new content to existing content for streaming
    const updatedContent = message.content + args.content;
    await ctx.db.patch(args.messageId, {
      content: updatedContent,
      updatedAt: Date.now()
    });
  },
});

// Generate AI response (internal)
export const generateAIResponse = internalAction({
  args: { 
    chatId: v.id("chats"),
    messageId: v.id("messages"),
    apiKey: v.string(),
    modelId: v.string(),
    userId: v.string(), // add userId
  },
  handler: async (ctx, args) => {
    // Get chat info
    const chat = await ctx.runQuery(internal.messages.getChat, {
      chatId: args.chatId,
    });
    if (!chat) {
      await ctx.runMutation(internal.messages.updateStreamingMessage, {
        messageId: args.messageId,
        content: "Error: Chat not found.",
      });
      return;
    }
    // Get recent messages for context, pass userId explicitly
    const messages = await ctx.runQuery(api.messages.list, {
      chatId: args.chatId,
      userId: args.userId,
    });
    // Format messages for the API
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));
    
    try {
      // Determine provider from model ID
      let provider: string;
      if (args.modelId.startsWith("gpt-") || args.modelId.startsWith("o1-") || args.modelId.startsWith("o2-") || args.modelId.startsWith("o3-")) {
        provider = "openai";
      } else if (args.modelId.startsWith("claude-")) {
        provider = "anthropic";
      } else if (args.modelId.startsWith("gemini-")) {
        provider = "google";
      } else {
        provider = "huggingface"; // Default for other models
      }
      
      // Call the appropriate model API based on provider
      let response = "";
      switch (provider) {
        case "openai":
          const openaiResponse = await ctx.runAction(internal.nodeActions.sendOpenAIMessageWithKey, {
            message: formattedMessages.map((m: any) => `${m.role}: ${m.content}`).join("\n"),
            modelId: args.modelId,
            apiKey: args.apiKey
          });
          response = openaiResponse.content;
          break;
        case "anthropic":
          const anthropicResponse = await ctx.runAction(internal.nodeActions.sendAnthropicMessageWithKey, {
            message: formattedMessages.map((m: any) => `${m.role}: ${m.content}`).join("\n"),
            modelId: args.modelId,
            apiKey: args.apiKey
          });
          response = anthropicResponse.content;
          break;
        case "google":
          const googleResponse = await ctx.runAction(internal.nodeActions.sendGeminiMessageWithKey, {
            message: formattedMessages.map((m: any) => `${m.role}: ${m.content}`).join("\n"),
            modelId: args.modelId,
            apiKey: args.apiKey
          });
          response = googleResponse.content;
          break;
        case "huggingface":
          response = `[Hugging Face - ${args.modelId}] I received your message. For now, this is a mock response.`;
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}. Please contact support.`);
      }
      
      // Update the message with the response
      await ctx.runMutation(internal.messages.updateStreamingMessage, {
        messageId: args.messageId,
        content: response,
      });
    } catch (error) {
      console.error("Error generating AI response:", error);
      // Provide more specific error messages
      let errorMessage = "Sorry, I encountered an error while generating a response.";
      if (error instanceof Error) {
        if (error.message.includes("API error")) {
          errorMessage = "Error: Failed to connect to the AI service. Please check your API key and try again.";
        } else if (error.message.includes("Unsupported provider")) {
          errorMessage = "Error: Unsupported AI model provider. Please contact support.";
        }
      }
      await ctx.runMutation(internal.messages.updateStreamingMessage, {
        messageId: args.messageId,
        content: errorMessage,
      });
    }
  },
});

// Get chat (internal) - simplified version without model lookup
export const getChat = internalQuery({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chatId);
  },
});
