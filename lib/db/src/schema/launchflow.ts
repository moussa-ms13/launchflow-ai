import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  jsonb,
  pgEnum,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./auth";

export const projectStatusEnum = pgEnum("project_status", [
  "pending",
  "processing",
  "awaiting_approval",
  "approved",
  "deployed",
  "failed",
]);

export const assetTypeEnum = pgEnum("asset_type", [
  "meta_ad_copy",
  "cold_email_sequence",
  "blog_post",
  "landing_page_html",
  "positioning_doc",
  "social_post",
]);

export const agentStatusEnum = pgEnum("agent_status", [
  "idle",
  "running",
  "completed",
  "error",
]);

export const gtmProjects = pgTable(
  "gtm_projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    productName: varchar("product_name", { length: 255 }).notNull(),
    productDescription: text("product_description").notNull(),
    targetAudience: text("target_audience").notNull(),
    websiteUrl: varchar("website_url", { length: 500 }),
    budget: varchar("budget", { length: 100 }),
    launchDate: timestamp("launch_date"),

    status: projectStatusEnum("status").default("pending").notNull(),

    competitorAgentStatus: agentStatusEnum("competitor_agent_status")
      .default("idle")
      .notNull(),
    marketingAgentStatus: agentStatusEnum("marketing_agent_status")
      .default("idle")
      .notNull(),
    landingPageAgentStatus: agentStatusEnum("landing_page_agent_status")
      .default("idle")
      .notNull(),

    isApprovedByHuman: boolean("is_approved_by_human").default(false).notNull(),
    approvedAt: timestamp("approved_at"),
    approvalNotes: text("approval_notes"),

    positioningStatement: text("positioning_statement"),
    targetPersona: jsonb("target_persona"),
    pricingRecommendation: jsonb("pricing_recommendation"),

    processingStartedAt: timestamp("processing_started_at"),
    processingCompletedAt: timestamp("processing_completed_at"),
    processingDurationMs: integer("processing_duration_ms"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("gtm_projects_user_id_idx").on(table.userId),
    statusIdx: index("gtm_projects_status_idx").on(table.status),
  })
);

export const competitorData = pgTable(
  "competitor_data",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => gtmProjects.id, { onDelete: "cascade" }),

    competitorName: varchar("competitor_name", { length: 255 }).notNull(),
    websiteUrl: varchar("website_url", { length: 500 }),

    pricingTiers: jsonb("pricing_tiers"),
    keyFeatures: jsonb("key_features"),
    targetSegments: jsonb("target_segments"),
    weaknesses: jsonb("weaknesses"),
    strengths: jsonb("strengths"),
    positioningAngle: text("positioning_angle"),
    reviewSentimentScore: integer("review_sentiment_score"),

    rawSearchData: jsonb("raw_search_data"),
    sourceUrls: jsonb("source_urls"),

    agentConfidenceScore: integer("agent_confidence_score"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index("competitor_data_project_id_idx").on(table.projectId),
  })
);

export const marketingAssets = pgTable(
  "marketing_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => gtmProjects.id, { onDelete: "cascade" }),

    assetType: assetTypeEnum("asset_type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),

    content: text("content").notNull(),
    contentJson: jsonb("content_json"),

    version: integer("version").default(1).notNull(),
    isActive: boolean("is_active").default(true).notNull(),

    isApproved: boolean("is_approved").default(false).notNull(),
    reviewNotes: text("review_notes"),
    approvedAt: timestamp("approved_at"),

    modelUsed: varchar("model_used", { length: 100 }),
    tokensUsed: integer("tokens_used"),
    generationDurationMs: integer("generation_duration_ms"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index("marketing_assets_project_id_idx").on(table.projectId),
    assetTypeIdx: index("marketing_assets_asset_type_idx").on(table.assetType),
  })
);

export const gtmProjectsRelations = relations(
  gtmProjects,
  ({ one, many }) => ({
    user: one(usersTable, {
      fields: [gtmProjects.userId],
      references: [usersTable.id],
    }),
    competitorData: many(competitorData),
    marketingAssets: many(marketingAssets),
  })
);

export const competitorDataRelations = relations(competitorData, ({ one }) => ({
  project: one(gtmProjects, {
    fields: [competitorData.projectId],
    references: [gtmProjects.id],
  }),
}));

export const marketingAssetsRelations = relations(
  marketingAssets,
  ({ one }) => ({
    project: one(gtmProjects, {
      fields: [marketingAssets.projectId],
      references: [gtmProjects.id],
    }),
  })
);
