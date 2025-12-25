import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run the procurement verifier agent every 15 minutes
crons.interval(
  "verifyPendingProcurementUrls",
  { minutes: 15 },
  internal.agent.procurementVerifier.verifyPendingBatch,
  { batchSize: 10 }
);

export default crons;

