import { defineEvent } from "@convex-dev/workflow";
import { v } from "convex/values";

export const resumeEvent = defineEvent({
  name: "resume",
  validator: v.object({
    workflowRecordId: v.id("leadHuntWorkflows"),
  }),
});
