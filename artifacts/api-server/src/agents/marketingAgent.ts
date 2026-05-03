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

interface MarketingOutput {
  positioningStatement: string;
  metaAdCopy: {
    variantA: { headline: string; body: string; cta: string };
    variantB: { headline: string; body: string; cta: string };
    variantC: { headline: string; body: string; cta: string };
  };
  coldEmailSequence: Array<{
    emailNumber: number;
    subject: string;
    body: string;
  }>;
  socialPosts: {
    linkedin: string;
    twitter: string;
    instagram: string;
  };
}

export async function runMarketingAgent(projectId: string): Promise<void> {
  await db
    .update(gtmProjects)
    .set({ marketingAgentStatus: "running", updatedAt: new Date() })
    .where(eq(gtmProjects.id, projectId));

  try {
    const [project] = await db
      .select()
      .from(gtmProjects)
      .where(eq(gtmProjects.id, projectId));

    if (!project) throw new Error(`Project ${projectId} not found`);

    // Load competitor data for positioning context
    const competitors = await db
      .select({
        competitorName: competitorData.competitorName,
        positioningAngle: competitorData.positioningAngle,
        weaknesses: competitorData.weaknesses,
      })
      .from(competitorData)
      .where(eq(competitorData.projectId, projectId));

    const competitorContext =
      competitors.length > 0
        ? competitors
            .map(
              (c) =>
                `- ${c.competitorName}: ${c.positioningAngle ?? "N/A"} | Weaknesses: ${Array.isArray(c.weaknesses) ? (c.weaknesses as string[]).join(", ") : "N/A"}`,
            )
            .join("\n")
        : "No competitor data available.";

    const client = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? "placeholder",
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });

    const prompt = `You are a world-class B2B SaaS copywriter and GTM strategist. Generate a complete marketing asset package for the following product.

PRODUCT INFO:
- Name: ${project.productName}
- Description: ${project.productDescription}
- Target audience: ${project.targetAudience}
- Budget: ${project.budget ?? "not specified"}
- Launch date: ${project.launchDate ? new Date(project.launchDate).toLocaleDateString() : "not specified"}
- Website: ${project.websiteUrl ?? "not provided"}

COMPETITOR LANDSCAPE:
${competitorContext}

INSTRUCTIONS:
Generate all marketing assets. Use specific, pain-point-driven copy. No fluff. Write like a top-tier copywriter.

Return ONLY valid JSON — no markdown fences, no explanation outside the JSON:

{
  "positioningStatement": "2-3 sentence positioning statement that differentiates from competitors",
  "metaAdCopy": {
    "variantA": {
      "headline": "string (40 chars max)",
      "body": "string (125 chars max)",
      "cta": "string (25 chars max)"
    },
    "variantB": {
      "headline": "string (40 chars max)",
      "body": "string (125 chars max)",
      "cta": "string (25 chars max)"
    },
    "variantC": {
      "headline": "string (40 chars max)",
      "body": "string (125 chars max)",
      "cta": "string (25 chars max)"
    }
  },
  "coldEmailSequence": [
    {
      "emailNumber": 1,
      "subject": "string",
      "body": "string (full email body, 150-250 words, use {{firstName}} for personalization)"
    },
    {
      "emailNumber": 2,
      "subject": "string",
      "body": "string"
    },
    {
      "emailNumber": 3,
      "subject": "string",
      "body": "string"
    }
  ],
  "socialPosts": {
    "linkedin": "string (150-200 words, professional tone, includes hook + insight + CTA)",
    "twitter": "string (under 280 chars, punchy, includes relevant hashtags)",
    "instagram": "string (caption with emoji, storytelling approach, CTA at end)"
  }
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

    let output: MarketingOutput;
    try {
      output = parseJsonResponse<MarketingOutput>(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*"positioningStatement"[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not extract JSON from marketing agent response");
      output = JSON.parse(jsonMatch[0]) as MarketingOutput;
    }

    // Delete any existing marketing assets (non-landing-page) before inserting
    const existingAssets = await db
      .select({ id: marketingAssets.id, assetType: marketingAssets.assetType })
      .from(marketingAssets)
      .where(eq(marketingAssets.projectId, projectId));

    const nonLandingPageIds = existingAssets
      .filter((a) => a.assetType !== "landing_page_html")
      .map((a) => a.id);

    for (const id of nonLandingPageIds) {
      await db.delete(marketingAssets).where(eq(marketingAssets.id, id));
    }

    const usage = response.usage;
    const tokensPerAsset = Math.round((usage.input_tokens + usage.output_tokens) / 4);

    const assets = [
      {
        projectId,
        assetType: "positioning_doc" as const,
        title: "Positioning Statement",
        content: output.positioningStatement,
        modelUsed: MODEL,
        tokensUsed: tokensPerAsset,
      },
      {
        projectId,
        assetType: "meta_ad_copy" as const,
        title: "Meta Ad Copy — 3 Variants",
        content: formatAdCopy(output.metaAdCopy),
        modelUsed: MODEL,
        tokensUsed: tokensPerAsset,
      },
      {
        projectId,
        assetType: "cold_email_sequence" as const,
        title: "Cold Email Sequence (3-Touch)",
        content: formatEmailSequence(output.coldEmailSequence),
        modelUsed: MODEL,
        tokensUsed: tokensPerAsset,
      },
      {
        projectId,
        assetType: "social_post" as const,
        title: "Social Media Posts (LinkedIn / Twitter / Instagram)",
        content: formatSocialPosts(output.socialPosts),
        modelUsed: MODEL,
        tokensUsed: tokensPerAsset,
      },
    ];

    await db.insert(marketingAssets).values(assets);

    // Update positioning statement on the project
    await db
      .update(gtmProjects)
      .set({
        positioningStatement: output.positioningStatement,
        marketingAgentStatus: "completed",
        updatedAt: new Date(),
      })
      .where(eq(gtmProjects.id, projectId));

    logger.info({ projectId, assets: assets.length }, "Marketing agent completed");
  } catch (err) {
    logger.error({ err, projectId }, "Marketing agent failed");
    await db
      .update(gtmProjects)
      .set({ marketingAgentStatus: "error", updatedAt: new Date() })
      .where(eq(gtmProjects.id, projectId));
  }
}

function formatAdCopy(
  adCopy: MarketingOutput["metaAdCopy"],
): string {
  return [
    "=== VARIANT A ===",
    `Headline: ${adCopy.variantA.headline}`,
    `Body: ${adCopy.variantA.body}`,
    `CTA: ${adCopy.variantA.cta}`,
    "",
    "=== VARIANT B ===",
    `Headline: ${adCopy.variantB.headline}`,
    `Body: ${adCopy.variantB.body}`,
    `CTA: ${adCopy.variantB.cta}`,
    "",
    "=== VARIANT C ===",
    `Headline: ${adCopy.variantC.headline}`,
    `Body: ${adCopy.variantC.body}`,
    `CTA: ${adCopy.variantC.cta}`,
  ].join("\n");
}

function formatEmailSequence(
  emails: MarketingOutput["coldEmailSequence"],
): string {
  return emails
    .map(
      (e) =>
        `=== EMAIL ${e.emailNumber} ===\nSubject: ${e.subject}\n\n${e.body}`,
    )
    .join("\n\n---\n\n");
}

function formatSocialPosts(posts: MarketingOutput["socialPosts"]): string {
  return [
    "=== LINKEDIN ===",
    posts.linkedin,
    "",
    "=== TWITTER / X ===",
    posts.twitter,
    "",
    "=== INSTAGRAM ===",
    posts.instagram,
  ].join("\n");
}
