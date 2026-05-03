import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { gtmProjects, competitorData, marketingAssets } from "@workspace/db";
import { logger } from "../lib/logger";

const MODEL = "claude-sonnet-4-6";

function parseJsonResponse<T>(text: string): T {
  const stripped = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/```\s*$/m, "")
    .trim();
  return JSON.parse(stripped) as T;
}

interface LandingPageOutput {
  html: string;
  title: string;
}

export async function runLandingPageAgent(projectId: string): Promise<void> {
  await db
    .update(gtmProjects)
    .set({ landingPageAgentStatus: "running", updatedAt: new Date() })
    .where(eq(gtmProjects.id, projectId));

  try {
    const [project] = await db
      .select()
      .from(gtmProjects)
      .where(eq(gtmProjects.id, projectId));

    if (!project) throw new Error(`Project ${projectId} not found`);

    // Load competitor strengths/weaknesses for differentiation
    const competitors = await db
      .select({
        competitorName: competitorData.competitorName,
        weaknesses: competitorData.weaknesses,
        positioningAngle: competitorData.positioningAngle,
      })
      .from(competitorData)
      .where(eq(competitorData.projectId, projectId));

    const differentiators =
      competitors.length > 0
        ? competitors
            .map(
              (c) =>
                `${c.competitorName} weakness: ${Array.isArray(c.weaknesses) ? (c.weaknesses as string[]).join(", ") : "N/A"}`,
            )
            .join("; ")
        : "";

    const positioningContext = project.positioningStatement
      ? `POSITIONING: ${project.positioningStatement}`
      : "";

    const client = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? "placeholder",
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });

    const prompt = `You are an elite conversion-rate-optimization expert and frontend developer. Generate a complete, self-contained, production-quality HTML landing page for the following product.

PRODUCT INFO:
- Name: ${project.productName}
- Description: ${project.productDescription}
- Target audience: ${project.targetAudience}
- Website: ${project.websiteUrl ?? ""}
- Budget: ${project.budget ?? ""}
${positioningContext}
${differentiators ? `COMPETITOR GAPS TO EXPLOIT: ${differentiators}` : ""}

REQUIREMENTS:
- Self-contained single HTML file (all CSS inline in <style> tag, no external dependencies except Google Fonts)
- Mobile-responsive using CSS Grid/Flexbox
- Dark, modern SaaS aesthetic (dark background #0a0a0f, indigo/purple accents #6366f1)
- Include sections: Hero (headline + subheadline + CTA), Problem/Solution, Key Features (3 cards), Social Proof (2-3 testimonial quotes), Pricing (2-3 tiers), FAQ (3-4 items), Footer with CTA
- Hero headline must be benefit-driven and specific (not generic)
- All copy must be tailored to the product — no lorem ipsum
- Include a working email signup form (action="#") in hero and footer
- CTA buttons use indigo gradient: background: linear-gradient(135deg, #6366f1, #4f46e5)
- Smooth scroll behavior, subtle hover animations on cards and buttons
- The page must look like a $10k agency landing page

Return a JSON object with exactly this structure (no markdown fences):
{
  "title": "Page title for the <title> tag",
  "html": "the complete HTML document as a string"
}`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    let output: LandingPageOutput;
    try {
      output = parseJsonResponse<LandingPageOutput>(rawText);
    } catch {
      // Sometimes Claude wraps the HTML itself without the json wrapper — try alternate extraction
      const jsonMatch = rawText.match(/\{[\s\S]*"html"[\s\S]*\}/);
      if (jsonMatch) {
        output = JSON.parse(jsonMatch[0]) as LandingPageOutput;
      } else {
        // Last resort: treat the full response as raw HTML
        const htmlMatch = rawText.match(/<!DOCTYPE html[\s\S]*/i);
        if (!htmlMatch) throw new Error("Could not extract HTML from landing page agent response");
        output = {
          title: `${project.productName} — Landing Page`,
          html: htmlMatch[0],
        };
      }
    }

    if (!output.html || output.html.length < 500) {
      throw new Error("Landing page HTML is too short — likely failed to generate");
    }

    // Delete any existing landing page assets
    const existingLandingPages = await db
      .select({ id: marketingAssets.id })
      .from(marketingAssets)
      .where(eq(marketingAssets.projectId, projectId));

    const landingPageIds = existingLandingPages.map((a) => a.id);
    // Filter by asset type check after fetching
    const allAssets = await db
      .select()
      .from(marketingAssets)
      .where(eq(marketingAssets.projectId, projectId));

    for (const asset of allAssets) {
      if (asset.assetType === "landing_page_html") {
        await db.delete(marketingAssets).where(eq(marketingAssets.id, asset.id));
      }
    }

    const usage = response.usage;

    await db.insert(marketingAssets).values({
      projectId,
      assetType: "landing_page_html",
      title: output.title || `${project.productName} — Landing Page`,
      content: output.html,
      modelUsed: MODEL,
      tokensUsed: usage.input_tokens + usage.output_tokens,
    });

    await db
      .update(gtmProjects)
      .set({ landingPageAgentStatus: "completed", updatedAt: new Date() })
      .where(eq(gtmProjects.id, projectId));

    logger.info(
      { projectId, htmlLength: output.html.length },
      "Landing page agent completed",
    );
  } catch (err) {
    logger.error({ err, projectId }, "Landing page agent failed");
    await db
      .update(gtmProjects)
      .set({ landingPageAgentStatus: "error", updatedAt: new Date() })
      .where(eq(gtmProjects.id, projectId));
  }
}
