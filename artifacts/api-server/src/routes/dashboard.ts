import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { gtmProjects, marketingAssets } from "@workspace/db";

const router: IRouter = Router();

// GET /api/dashboard/stats
router.get("/dashboard/stats", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const userId = req.user!.id;

    const projects = await db
      .select()
      .from(gtmProjects)
      .where(eq(gtmProjects.userId, userId))
      .orderBy(desc(gtmProjects.createdAt));

    const projectsByStatus: Record<string, number> = {};
    for (const p of projects) {
      projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;
    }

    const projectIds = projects.map((p) => p.id);
    let totalAssets = 0;
    let approvedAssets = 0;

    if (projectIds.length > 0) {
      const allAssets = (
        await Promise.all(
          projectIds.map((id) =>
            db.select().from(marketingAssets).where(eq(marketingAssets.projectId, id))
          )
        )
      ).flat();
      totalAssets = allAssets.length;
      approvedAssets = allAssets.filter((a) => a.isApproved).length;
    }

    const strategiesApproved = projects.filter((p) => p.isApprovedByHuman).length;

    res.json({
      totalProjects: projects.length,
      projectsByStatus,
      totalAssets,
      approvedAssets,
      strategiesApproved,
      recentProjects: projects.slice(0, 5),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

export default router;
