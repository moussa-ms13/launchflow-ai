import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  gtmProjects,
  competitorData,
  marketingAssets,
} from "@workspace/db";
import { runAgentOrchestrator } from "../agents/orchestrator";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// GET /api/projects
router.get("/projects", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  try {
    const projects = await db
      .select()
      .from(gtmProjects)
      .where(eq(gtmProjects.userId, req.user!.id));

    res.json({ projects });
  } catch (err) {
    req.log.error({ err }, "Failed to list projects");
    res.status(500).json({ error: "Failed to list projects" });
  }
});

// POST /api/projects
router.post("/projects", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { productName, productDescription, targetAudience, websiteUrl, budget, launchDate } = req.body;

  if (!productName || !productDescription || !targetAudience) {
    res.status(400).json({ error: "productName, productDescription, and targetAudience are required" });
    return;
  }

  try {
    const [project] = await db
      .insert(gtmProjects)
      .values({
        userId: req.user!.id,
        productName,
        productDescription,
        targetAudience,
        websiteUrl: websiteUrl || null,
        budget: budget || null,
        launchDate: launchDate ? new Date(launchDate) : null,
      })
      .returning();

    res.status(201).json(project);
  } catch (err) {
    req.log.error({ err }, "Failed to create project");
    res.status(500).json({ error: "Failed to create project" });
  }
});

// GET /api/projects/:projectId
router.get("/projects/:projectId", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { projectId } = req.params;

  try {
    const [project] = await db
      .select()
      .from(gtmProjects)
      .where(and(eq(gtmProjects.id, projectId), eq(gtmProjects.userId, req.user!.id)));

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [competitors, assets] = await Promise.all([
      db.select().from(competitorData).where(eq(competitorData.projectId, projectId)),
      db.select().from(marketingAssets).where(eq(marketingAssets.projectId, projectId)),
    ]);

    res.json({ ...project, competitors, assets });
  } catch (err) {
    req.log.error({ err }, "Failed to get project");
    res.status(500).json({ error: "Failed to get project" });
  }
});

// PATCH /api/projects/:projectId
router.patch("/projects/:projectId", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { projectId } = req.params;
  const { productName, productDescription, targetAudience, websiteUrl, budget, launchDate } = req.body;

  try {
    const [existing] = await db
      .select()
      .from(gtmProjects)
      .where(and(eq(gtmProjects.id, projectId), eq(gtmProjects.userId, req.user!.id)));

    if (!existing) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const updates: Partial<typeof existing> = { updatedAt: new Date() };
    if (productName !== undefined) updates.productName = productName;
    if (productDescription !== undefined) updates.productDescription = productDescription;
    if (targetAudience !== undefined) updates.targetAudience = targetAudience;
    if (websiteUrl !== undefined) updates.websiteUrl = websiteUrl;
    if (budget !== undefined) updates.budget = budget;
    if (launchDate !== undefined) updates.launchDate = new Date(launchDate);

    const [updated] = await db
      .update(gtmProjects)
      .set(updates)
      .where(eq(gtmProjects.id, projectId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update project");
    res.status(500).json({ error: "Failed to update project" });
  }
});

// DELETE /api/projects/:projectId
router.delete("/projects/:projectId", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { projectId } = req.params;

  try {
    const [existing] = await db
      .select()
      .from(gtmProjects)
      .where(and(eq(gtmProjects.id, projectId), eq(gtmProjects.userId, req.user!.id)));

    if (!existing) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    await db.delete(gtmProjects).where(eq(gtmProjects.id, projectId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete project");
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// POST /api/projects/:projectId/approve
router.post("/projects/:projectId/approve", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { projectId } = req.params;
  const { approved, notes } = req.body;

  try {
    const [existing] = await db
      .select()
      .from(gtmProjects)
      .where(and(eq(gtmProjects.id, projectId), eq(gtmProjects.userId, req.user!.id)));

    if (!existing) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [updated] = await db
      .update(gtmProjects)
      .set({
        isApprovedByHuman: !!approved,
        approvedAt: approved ? new Date() : null,
        approvalNotes: notes || null,
        status: approved ? "approved" : existing.status,
        updatedAt: new Date(),
      })
      .where(eq(gtmProjects.id, projectId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to approve project");
    res.status(500).json({ error: "Failed to approve project" });
  }
});

// POST /api/projects/:projectId/run-agents
router.post("/projects/:projectId/run-agents", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { projectId } = req.params;

  try {
    const [existing] = await db
      .select()
      .from(gtmProjects)
      .where(and(eq(gtmProjects.id, projectId), eq(gtmProjects.userId, req.user!.id)));

    if (!existing) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [updated] = await db
      .update(gtmProjects)
      .set({
        status: "processing",
        competitorAgentStatus: "running",
        marketingAgentStatus: "running",
        landingPageAgentStatus: "running",
        processingStartedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(gtmProjects.id, projectId))
      .returning();

    // Fire and forget real AI agent orchestrator
    runAgentOrchestrator(projectId).catch((err) => {
      req.log.error({ err }, "Agent orchestrator error");
    });

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to run agents");
    res.status(500).json({ error: "Failed to run agents" });
  }
});

// GET /api/projects/:projectId/assets
router.get("/projects/:projectId/assets", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { projectId } = req.params;

  try {
    const [project] = await db
      .select({ id: gtmProjects.id })
      .from(gtmProjects)
      .where(and(eq(gtmProjects.id, projectId), eq(gtmProjects.userId, req.user!.id)));

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const assets = await db
      .select()
      .from(marketingAssets)
      .where(eq(marketingAssets.projectId, projectId));

    res.json({ assets });
  } catch (err) {
    req.log.error({ err }, "Failed to list assets");
    res.status(500).json({ error: "Failed to list assets" });
  }
});

// GET /api/projects/:projectId/assets/:assetId
router.get("/projects/:projectId/assets/:assetId", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { projectId, assetId } = req.params;

  try {
    const [project] = await db
      .select({ id: gtmProjects.id })
      .from(gtmProjects)
      .where(and(eq(gtmProjects.id, projectId), eq(gtmProjects.userId, req.user!.id)));

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [asset] = await db
      .select()
      .from(marketingAssets)
      .where(and(eq(marketingAssets.id, assetId), eq(marketingAssets.projectId, projectId)));

    if (!asset) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }

    res.json(asset);
  } catch (err) {
    req.log.error({ err }, "Failed to get asset");
    res.status(500).json({ error: "Failed to get asset" });
  }
});

// PATCH /api/projects/:projectId/assets/:assetId
router.patch("/projects/:projectId/assets/:assetId", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { projectId, assetId } = req.params;
  const { isApproved, reviewNotes } = req.body;

  try {
    const [project] = await db
      .select({ id: gtmProjects.id })
      .from(gtmProjects)
      .where(and(eq(gtmProjects.id, projectId), eq(gtmProjects.userId, req.user!.id)));

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [existing] = await db
      .select()
      .from(marketingAssets)
      .where(and(eq(marketingAssets.id, assetId), eq(marketingAssets.projectId, projectId)));

    if (!existing) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }

    const updates: Partial<typeof existing> = { updatedAt: new Date() };
    if (isApproved !== undefined) {
      updates.isApproved = isApproved;
      updates.approvedAt = isApproved ? new Date() : null;
    }
    if (reviewNotes !== undefined) updates.reviewNotes = reviewNotes;

    const [updated] = await db
      .update(marketingAssets)
      .set(updates)
      .where(eq(marketingAssets.id, assetId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update asset");
    res.status(500).json({ error: "Failed to update asset" });
  }
});

// GET /api/projects/:projectId/competitors
router.get("/projects/:projectId/competitors", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { projectId } = req.params;

  try {
    const [project] = await db
      .select({ id: gtmProjects.id })
      .from(gtmProjects)
      .where(and(eq(gtmProjects.id, projectId), eq(gtmProjects.userId, req.user!.id)));

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const competitors = await db
      .select()
      .from(competitorData)
      .where(eq(competitorData.projectId, projectId));

    res.json({ competitors });
  } catch (err) {
    req.log.error({ err }, "Failed to list competitors");
    res.status(500).json({ error: "Failed to list competitors" });
  }
});

// GET /api/projects/:projectId/preview — serve raw landing page HTML
router.get("/projects/:projectId/preview", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { projectId } = req.params;

  try {
    const [project] = await db
      .select({ id: gtmProjects.id })
      .from(gtmProjects)
      .where(and(eq(gtmProjects.id, projectId), eq(gtmProjects.userId, req.user!.id)));

    if (!project) {
      res.status(404).send("<p>Project not found</p>");
      return;
    }

    const assets = await db
      .select()
      .from(marketingAssets)
      .where(and(eq(marketingAssets.projectId, projectId), eq(marketingAssets.assetType, "landing_page_html")));

    if (assets.length === 0) {
      res.status(404).send(`<!DOCTYPE html><html><body style="background:#0a0a0f;color:#6b7280;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p>Landing page not generated yet. Run AI agents first.</p></body></html>`);
      return;
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.send(assets[0].content);
  } catch (err) {
    req.log.error({ err }, "Failed to serve landing page preview");
    res.status(500).send("<p>Error loading preview</p>");
  }
});

export default router;
