import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { gtmProjects, competitorData } from "@workspace/db";
import { logger } from "../lib/logger";

const MODEL = "claude-sonnet-4-6";
const MAX_TURNS = 12;

// Strip markdown code fences before parsing JSON
function parseJsonResponse<T>(text: string): T {
  const stripped = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/```\s*$/m, "")
    .trim();
  return JSON.parse(stripped) as T;
}

interface CompetitorResult {
  competitorName: string;
  websiteUrl: string;
  keyFeatures: string[];
  strengths: string[];
  weaknesses: string[];
  positioningAngle: string;
  pricingTiers: Array<{ name: string; price: string }>;
  targetSegments: string[];
  reviewSentimentScore: number;
  agentConfidenceScore: number;
}

interface CompetitorReport {
  competitors: CompetitorResult[];
}

async function callClaudeWithWebSearch(
  client: Anthropic,
  prompt: string,
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: prompt },
  ];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      tools: [
        {
          type: "web_search_20250305" as const,
          name: "web_search",
        },
      ],
      messages,
    });

    // Add assistant response to history
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      // Extract all text blocks and join
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
    }

    if (response.stop_reason === "tool_use") {
      // For web_search_20250305, Anthropic executes the search and may include
      // web_search_tool_result blocks in the response content alongside tool_use blocks.
      // Collect those and pass them back as the user message.
      const webSearchResults = response.content.filter(
        (b) => (b as { type: string }).type === "web_search_tool_result",
      );

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );

      if (webSearchResults.length > 0) {
        // Anthropic provided results — forward them as user content
        messages.push({
          role: "user",
          content: webSearchResults as Anthropic.ToolResultBlockParam[],
        });
      } else if (toolUseBlocks.length > 0) {
        // Fallback: send empty tool results so the loop can continue
        messages.push({
          role: "user",
          content: toolUseBlocks.map((b) => ({
            type: "tool_result" as const,
            tool_use_id: b.id,
            content: "Search completed.",
          })),
        });
      }
    }
  }

  throw new Error("Web search agent exceeded max turns without finishing");
}

export async function runCompetitorAgent(projectId: string): Promise<void> {
  // Mark agent as running
  await db
    .update(gtmProjects)
    .set({ competitorAgentStatus: "running", updatedAt: new Date() })
    .where(eq(gtmProjects.id, projectId));

  try {
    const [project] = await db
      .select()
      .from(gtmProjects)
      .where(eq(gtmProjects.id, projectId));

    if (!project) throw new Error(`Project ${projectId} not found`);

    const client = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? "placeholder",
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });

    const prompt = `You are a B2B competitive intelligence analyst. Use web search to research real competitors for the following product.

PRODUCT INFO:
- Name: ${project.productName}
- Description: ${project.productDescription}
- Target audience: ${project.targetAudience}
- Website: ${project.websiteUrl ?? "not provided"}

INSTRUCTIONS:
1. Search the web to identify 3 to 5 real direct competitors in this space.
2. For each competitor, search for their pricing page, feature list, and customer reviews.
3. After gathering data, respond with ONLY a valid JSON object — no markdown fences, no explanation.

OUTPUT FORMAT (return exactly this JSON structure):
{
  "competitors": [
    {
      "competitorName": "string",
      "websiteUrl": "string",
      "keyFeatures": ["string"],
      "strengths": ["string (2-4 items)"],
      "weaknesses": ["string (2-4 items)"],
      "positioningAngle": "string (1 sentence)",
      "pricingTiers": [{"name": "string", "price": "string"}],
      "targetSegments": ["string"],
      "reviewSentimentScore": number between 0-100,
      "agentConfidenceScore": number between 0-100
    }
  ]
}`;

    const rawText = await callClaudeWithWebSearch(client, prompt);

    let report: CompetitorReport;
    try {
      report = parseJsonResponse<CompetitorReport>(rawText);
    } catch {
      // If the response contains JSON somewhere, try to extract it
      const jsonMatch = rawText.match(/\{[\s\S]*"competitors"[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not extract JSON from competitor agent response");
      report = JSON.parse(jsonMatch[0]) as CompetitorReport;
    }

    if (!report.competitors?.length) throw new Error("No competitors returned");

    // Delete any existing competitor data before inserting fresh results
    await db
      .delete(competitorData)
      .where(eq(competitorData.projectId, projectId));

    await db.insert(competitorData).values(
      report.competitors.map((c) => ({
        projectId,
        competitorName: c.competitorName,
        websiteUrl: c.websiteUrl ?? null,
        keyFeatures: c.keyFeatures ?? [],
        strengths: c.strengths ?? [],
        weaknesses: c.weaknesses ?? [],
        positioningAngle: c.positioningAngle ?? null,
        pricingTiers: c.pricingTiers ?? [],
        targetSegments: c.targetSegments ?? [],
        reviewSentimentScore: c.reviewSentimentScore ?? null,
        agentConfidenceScore: c.agentConfidenceScore ?? null,
      })),
    );

    await db
      .update(gtmProjects)
      .set({ competitorAgentStatus: "completed", updatedAt: new Date() })
      .where(eq(gtmProjects.id, projectId));

    logger.info({ projectId, count: report.competitors.length }, "Competitor agent completed");
  } catch (err) {
    logger.error({ err, projectId }, "Competitor agent failed");
    await db
      .update(gtmProjects)
      .set({ competitorAgentStatus: "error", updatedAt: new Date() })
      .where(eq(gtmProjects.id, projectId));
  }
}
