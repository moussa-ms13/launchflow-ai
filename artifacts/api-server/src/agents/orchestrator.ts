import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { gtmProjects } from "@workspace/db";
import { logger } from "../lib/logger";
import { runCompetitorAgent } from "./competitorAgent";
import { runMarketingAgent } from "./marketingAgent";
import { runLandingPageAgent } from "./landingPageAgent";

const STAGGER_MS = 300;

/**
 * Orchestrate all 3 AI agents in parallel with Promise.allSettled.
 * Each agent handles its own DB updates and never throws.
 * Once all settle, project status is set to "awaiting_approval".
 */
export async function runAgentOrchestrator(projectId: string): Promise<void> {
  logger.info({ projectId }, "Agent orchestrator started");

  const startedAt = new Date();

  // Stagger agent starts by 300ms each to avoid rate limits
  const competitorPromise = runCompetitorAgent(projectId);

  const marketingPromise = new Promise<void>((resolve) => {
    setTimeout(() => resolve(runMarketingAgent(projectId)), STAGGER_MS);
  });

  const landingPagePromise = new Promise<void>((resolve) => {
    setTimeout(() => resolve(runLandingPageAgent(projectId)), STAGGER_MS * 2);
  });

  const results = await Promise.allSettled([
    competitorPromise,
    marketingPromise,
    landingPagePromise,
  ]);

  const completedAt = new Date();
  const durationMs = completedAt.getTime() - startedAt.getTime();

  // Log any unexpected rejections (agents should not throw, but just in case)
  results.forEach((result, i) => {
    const names = ["competitor", "marketing", "landingPage"];
    if (result.status === "rejected") {
      logger.error(
        { projectId, agent: names[i], reason: result.reason },
        "Agent promise rejected unexpectedly",
      );
    }
  });

  // Re-read project to check individual agent statuses
  const [project] = await db
    .select({
      competitorAgentStatus: gtmProjects.competitorAgentStatus,
      marketingAgentStatus: gtmProjects.marketingAgentStatus,
      landingPageAgentStatus: gtmProjects.landingPageAgentStatus,
    })
    .from(gtmProjects)
    .where(eq(gtmProjects.id, projectId));

  const allFailed =
    project &&
    project.competitorAgentStatus === "error" &&
    project.marketingAgentStatus === "error" &&
    project.landingPageAgentStatus === "error";

  const finalStatus = allFailed ? "failed" : "awaiting_approval";

  await db
    .update(gtmProjects)
    .set({
      status: finalStatus,
      processingCompletedAt: completedAt,
      processingDurationMs: durationMs,
      updatedAt: new Date(),
    })
    .where(eq(gtmProjects.id, projectId));

  logger.info(
    { projectId, status: finalStatus, durationMs },
    "Agent orchestrator completed",
  );
}
