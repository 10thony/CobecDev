import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function useLogger() {
  const createLog = useMutation(api.logs.createLog);

  const logAction = async (
    userId: Id<"users">,
    action: string,
    details: {
      provider?: string;
      model?: string;
      messageId?: Id<"messages">;
      metadata?: any;
    } = {}
  ) => {
    try {
      await createLog({
        userId,
        action,
        type: "action",
        details,
      });
    } catch (error) {
      console.error("Failed to log action:", error);
    }
  };

  const logError = async (
    userId: Id<"users">,
    action: string,
    error: Error,
    details: {
      provider?: string;
      model?: string;
      messageId?: Id<"messages">;
      metadata?: any;
    } = {}
  ) => {
    try {
      await createLog({
        userId,
        action,
        type: "error",
        details: {
          ...details,
          errorMessage: error.message,
          stackTrace: error.stack,
        },
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
  };

  return {
    logAction,
    logError,
  };
} 