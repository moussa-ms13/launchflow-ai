# LaunchFlow AI — Technical Execution Plan
### Lead Architect Brief · Replit RepliCon Buildathon 10 · 24-Hour Sprint

---

> **Project:** LaunchFlow AI — Autonomous GTM Strategy Orchestrator
> **Stack:** Replit Agent 4 · Node.js · React · PostgreSQL (Drizzle ORM) · Claude Sonnet 4 · Replit Auth
> **Constraint:** Production-ready within 24 hours. Zero manual infra setup.

---

## SECTION 1 — DATABASE SCHEMA & ARCHITECTURE

### 1.1 Schema Overview (Entity Relationship)

```
Users ──< GTM_Projects ──< Competitor_Data
                       └──< Marketing_Assets
```

All tables use UUIDs as primary keys for scalability. `GTM_Projects` is the central domain object linking all derived agent outputs.

---

### 1.2 Drizzle ORM Schema — `schema.ts`

```typescript
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

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────

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

// ─────────────────────────────────────────
// TABLE: users
// ─────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  replitUserId: varchar("replit_user_id", { length: 255 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique(),
  displayName: varchar("display_name", { length: 255 }),
  companyName: varchar("company_name", { length: 255 }),
  avatarUrl: text("avatar_url"),
  plan: varchar("plan", { length: 50 }).default("free").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────
// TABLE: gtm_projects
// ─────────────────────────────────────────

export const gtmProjects = pgTable(
  "gtm_projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // User inputs
    productName: varchar("product_name", { length: 255 }).notNull(),
    productDescription: text("product_description").notNull(),
    targetAudience: text("target_audience").notNull(),
    websiteUrl: varchar("website_url", { length: 500 }),
    budget: varchar("budget", { length: 100 }),
    launchDate: timestamp("launch_date"),

    // Orchestration state
    status: projectStatusEnum("status").default("pending").notNull(),

    // Agent thread tracking
    competitorAgentStatus: agentStatusEnum("competitor_agent_status")
      .default("idle")
      .notNull(),
    marketingAgentStatus: agentStatusEnum("marketing_agent_status")
      .default("idle")
      .notNull(),
    landingPageAgentStatus: agentStatusEnum("landing_page_agent_status")
      .default("idle")
      .notNull(),

    // Human-in-the-loop approval gate
    isApprovedByHuman: boolean("is_approved_by_human").default(false).notNull(),
    approvedAt: timestamp("approved_at"),
    approvalNotes: text("approval_notes"),

    // Aggregate output summary (stored for dashboard rendering)
    positioningStatement: text("positioning_statement"),
    targetPersona: jsonb("target_persona"),   // { name, role, painPoints, goals }
    pricingRecommendation: jsonb("pricing_recommendation"),

    // Metadata
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

// ─────────────────────────────────────────
// TABLE: competitor_data
// ─────────────────────────────────────────

export const competitorData = pgTable(
  "competitor_data",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => gtmProjects.id, { onDelete: "cascade" }),

    // Competitor identification
    competitorName: varchar("competitor_name", { length: 255 }).notNull(),
    websiteUrl: varchar("website_url", { length: 500 }),

    // Structured analysis (agent-populated)
    pricingTiers: jsonb("pricing_tiers"),     // [{ name, price, features[] }]
    keyFeatures: jsonb("key_features"),        // string[]
    targetSegments: jsonb("target_segments"),  // string[]
    weaknesses: jsonb("weaknesses"),           // string[]  (from review mining)
    strengths: jsonb("strengths"),             // string[]
    positioningAngle: text("positioning_angle"),
    reviewSentimentScore: integer("review_sentiment_score"), // -100 to 100

    // Raw agent output (for audit)
    rawSearchData: jsonb("raw_search_data"),
    sourceUrls: jsonb("source_urls"),          // string[]

    agentConfidenceScore: integer("agent_confidence_score"), // 0-100

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index("competitor_data_project_id_idx").on(table.projectId),
  })
);

// ─────────────────────────────────────────
// TABLE: marketing_assets
// ─────────────────────────────────────────

export const marketingAssets = pgTable(
  "marketing_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => gtmProjects.id, { onDelete: "cascade" }),

    assetType: assetTypeEnum("asset_type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),

    // The actual generated content
    content: text("content").notNull(),
    contentJson: jsonb("content_json"),  // Structured version (e.g., email sequence array)

    // Versioning
    version: integer("version").default(1).notNull(),
    isActive: boolean("is_active").default(true).notNull(),

    // Human review
    isApproved: boolean("is_approved").default(false).notNull(),
    reviewNotes: text("review_notes"),
    approvedAt: timestamp("approved_at"),

    // Generation metadata
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

// ─────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  gtmProjects: many(gtmProjects),
}));

export const gtmProjectsRelations = relations(
  gtmProjects,
  ({ one, many }) => ({
    user: one(users, {
      fields: [gtmProjects.userId],
      references: [users.id],
    }),
    competitorData: many(competitorData),
    marketingAssets: many(marketingAssets),
  })
);

export const competitorDataRelations = relations(
  competitorData,
  ({ one }) => ({
    project: one(gtmProjects, {
      fields: [competitorData.projectId],
      references: [gtmProjects.id],
    }),
  })
);

export const marketingAssetsRelations = relations(
  marketingAssets,
  ({ one }) => ({
    project: one(gtmProjects, {
      fields: [marketingAssets.projectId],
      references: [gtmProjects.id],
    }),
  })
);
```

### 1.3 Migration Command (run once at project start)

```bash
npx drizzle-kit push:pg
```

---

## SECTION 2 — TECH STACK & INTEGRATIONS CHECKLIST

### 2.1 Full Stack Matrix

| Layer | Technology | Rationale |
|---|---|---|
| **Runtime** | Node.js 20 (via Replit) | Native Replit support, async I/O for agent polling |
| **Backend Framework** | Express.js + TypeScript | Lightweight, easy RESTful API scaffolding |
| **Frontend** | React 18 + Vite + TypeScript | Fast HMR, component-based dashboard |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid professional UI; no design debt |
| **Charts** | Recharts | Competitor matrix visualizations |
| **ORM** | Drizzle ORM | Type-safe, zero-overhead PostgreSQL queries |
| **Database** | Replit Built-in PostgreSQL | Zero setup, persistent, auto-provisioned |
| **Auth** | Replit Auth (OpenID Connect) | One-line setup, SSO for all users |
| **State Management** | TanStack Query (React Query) | Server state sync, polling agent status |
| **Real-time Updates** | Server-Sent Events (SSE) | Stream agent progress to dashboard |
| **Mobile PWA** | Vite PWA Plugin | Progressive Web App for mobile approval flow |

### 2.2 AI Models & API Integrations

| Agent Role | Model / API | Purpose |
|---|---|---|
| **Competitor Intelligence Agent** | `claude-sonnet-4-20250514` + Web Search Tool | Live internet research, competitor pricing extraction |
| **Marketing Asset Agent** | `claude-sonnet-4-20250514` | Ad copy, email sequences, positioning doc generation |
| **Landing Page Agent** | `claude-sonnet-4-20250514` | React + Tailwind component generation |
| **Security Audit Agent** | `claude-sonnet-4-20250514` | Pre-deployment vulnerability scan prompt |
| **Web Search** | Anthropic Web Search Tool (`web_search_20250305`) | Grounded real-time market data |

### 2.3 Replit-Native Tools Checklist

```
✅ Replit Auth          → Zero-config user sessions (OIDC)
✅ Replit PostgreSQL    → Built-in persistent DB, auto-connected
✅ Replit Secrets       → Store ANTHROPIC_API_KEY, never hardcode
✅ Replit Deployments   → One-click production hosting with custom domain
✅ Replit Agent Tasks   → Kanban board for parallel micro-VM orchestration
✅ Infinite Canvas      → Visual UI polish & responsive adjustments
✅ Auto Rollback        → Checkpoint recovery during marathon
```

### 2.4 Environment Variables (`.env`)

```bash
# Set in Replit Secrets panel — never in code
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...  # Auto-injected by Replit
SESSION_SECRET=...             # Auto-generated by Replit Auth
NODE_ENV=production
PORT=3000
```

---

## SECTION 3 — PARALLEL EXECUTION ROADMAP

### 3.1 Overview: The Parallel Agent Strategy

The core competitive advantage is **never working sequentially**. At every phase, split work across Replit Agent chat threads. The principle:

```
Thread A (Infrastructure)  ──┐
Thread B (Frontend Shell)  ──┼──▶ Merge at Phase Gate ──▶ Thread C (AI Logic)
Thread C (DB Schema)       ──┘
```

---

### 3.2 PHASE 0 — Project Bootstrap (Hour 0:00–0:30)

**Single sequential step. Must complete before parallelism begins.**

**Prompt 0.1 — Project Initialization (paste into Replit Agent)**

```
You are setting up a production-grade B2B SaaS called "LaunchFlow AI".

Initialize this Replit project with:
1. A Node.js + TypeScript Express backend in /server
2. A React + Vite + TypeScript frontend in /client
3. Shared /shared folder for types and schema
4. Install dependencies:
   Backend: express, drizzle-orm, pg, drizzle-kit, @anthropic-ai/sdk,
            cors, dotenv, express-session, zod, uuid
   Frontend: react, react-dom, vite, tailwindcss, @tanstack/react-query,
             recharts, lucide-react, shadcn-ui, axios

5. Configure Replit Auth middleware on the backend using the
   REPL_ID and REPLIT_DB_URL environment variables.

6. Set up a /server/db.ts file that connects Drizzle ORM
   to the Replit PostgreSQL instance via DATABASE_URL.

7. Create the file /shared/schema.ts and paste the following
   Drizzle schema exactly: [PASTE FULL SCHEMA FROM SECTION 1.2]

8. Run: npx drizzle-kit push:pg to create all tables.

9. Start both dev servers concurrently (backend :3000, frontend :5173).

Confirm by showing me the running server logs.
```

---

### 3.3 PHASE 1 — Parallel Foundation Build (Hour 0:30–4:00)

**Open 2 Replit Agent threads simultaneously.**

---

#### ⚡ THREAD A — Backend API & Auth (Hours 0:30–3:00)

**Prompt 1A:**

```
In the /server directory, build the complete Express REST API for LaunchFlow AI.

ENDPOINTS TO CREATE:

Authentication (using Replit Auth):
  GET  /api/auth/user       → Return current session user or 401
  POST /api/auth/logout     → Clear session

GTM Projects:
  POST /api/projects        → Create new GTM project (body: productName,
                              productDescription, targetAudience,
                              websiteUrl, budget)
  GET  /api/projects        → List all projects for authenticated user
  GET  /api/projects/:id    → Get single project with all related data
  PUT  /api/projects/:id/approve → Human approval gate: set
                                   isApprovedByHuman=true, record approvedAt

Assets:
  GET  /api/projects/:id/assets          → List all assets for a project
  PUT  /api/projects/:id/assets/:assetId → Update approval status of an asset

Agent Orchestration:
  POST /api/projects/:id/orchestrate     → Trigger parallel agent execution
                                           (returns 202 Accepted immediately)
  GET  /api/projects/:id/status          → SSE endpoint for real-time
                                           agent progress streaming

REQUIREMENTS:
- All routes except /api/auth/user must verify authenticated session.
- Use Drizzle ORM with the schema from /shared/schema.ts for all DB ops.
- The POST /api/projects/:id/orchestrate endpoint must:
    1. Update project status to "processing"
    2. Launch 3 async agent functions WITHOUT awaiting them (fire-and-forget)
    3. Return { message: "Orchestration started", projectId } immediately
- The SSE endpoint must push JSON events every 3 seconds with agent
  statuses from the DB.
- Wrap all DB calls in try/catch with proper error responses.

Use TypeScript throughout. Export the Express app from /server/index.ts.
```

---

#### ⚡ THREAD B — React Frontend Shell (Hours 0:30–3:00)

**Prompt 1B:**

```
In the /client directory, build the complete React frontend shell
for LaunchFlow AI. Use Tailwind CSS and shadcn/ui components.

PAGES & ROUTES (use React Router v6):
  /             → Landing/Login page (shows "Sign in with Replit" button)
  /dashboard    → Protected: List of user's GTM projects
  /projects/new → Protected: Multi-step form to create a new project
  /projects/:id → Protected: Full project detail view (the main dashboard)
  /projects/:id/mobile → Simplified mobile approval view (PWA-optimized)

COMPONENT STRUCTURE:
  components/
    Layout.tsx          → Sidebar nav + top bar with user avatar
    ProjectCard.tsx     → Card showing project name, status badge, created date
    StatusBadge.tsx     → Color-coded pill: pending/processing/approved/deployed
    AgentKanbanBoard.tsx → 4 columns: Drafts | Active | Ready | Complete
                           with live-updating cards for each agent thread
    CompetitorMatrix.tsx → Recharts BarChart comparing competitor pricing tiers
    AssetCard.tsx       → Displays generated asset with Approve/Edit buttons
    HumanApprovalGate.tsx → Modal requiring explicit "Approve & Deploy" click
    ProgressRing.tsx    → Circular progress for agent completion percentage

DESIGN REQUIREMENTS:
- Dark mode by default. Color scheme: slate-900 bg, violet-500 accent.
- The /projects/:id page has a 3-panel layout:
    Left panel (25%): Project info + agent Kanban board
    Center panel (50%): Marketing assets tabs (Ads | Emails | Landing Page)
    Right panel (25%): Competitor matrix chart + pricing table
- Add a prominent orange "⚠️ Awaiting Your Approval" banner when
  project status is "awaiting_approval".
- The HumanApprovalGate modal must require the user to type "APPROVE"
  to confirm — this is a security feature, not optional.

Use TanStack Query for all data fetching. Poll /api/projects/:id/status
every 3 seconds while status is "processing".
```

---

### 3.4 PHASE 2 — AI Agent Core Logic (Hour 4:00–10:00)

**After Phase 1 threads complete, open 3 agent threads simultaneously.**

---

#### ⚡ THREAD A — Competitor Intelligence Agent (Hours 4:00–7:00)

**Prompt 2A:**

```
In /server/agents/competitorAgent.ts, build the Competitor Intelligence Agent.

This agent function signature:
  async function runCompetitorAgent(projectId: string): Promise<void>

LOGIC:
1. Fetch the GTM project from DB by projectId. Get productName,
   productDescription, and targetAudience.

2. Update competitor_agent_status to "running" in gtm_projects table.

3. Call the Anthropic API with these settings:
   - model: "claude-sonnet-4-20250514"
   - max_tokens: 4000
   - tools: [{ type: "web_search_20250305", name: "web_search" }]
   - System prompt:
       "You are a senior market research analyst. You have access to
        real-time web search. Your job is to find the top 3-5 direct
        competitors for the described product. For each competitor extract:
        name, website, pricing tiers (as JSON array), key features,
        target customer segments, identified weaknesses from user reviews,
        strengths, and overall positioning angle.
        Return ONLY valid JSON in this exact structure:
        { competitors: [{ name, websiteUrl, pricingTiers, keyFeatures,
          targetSegments, weaknesses, strengths, positioningAngle,
          reviewSentimentScore }] }"
   - User message: "Research competitors for: [productName].
       Description: [productDescription]. Target audience: [targetAudience]."

4. Parse the JSON response. For each competitor, INSERT a row into
   competitor_data table linked to the projectId.

5. Update competitor_agent_status to "completed".

6. Check if all 3 agents are complete → if yes, set project status
   to "awaiting_approval".

Handle errors: on failure set competitor_agent_status to "error"
and log the error to console. Never throw — this runs in background.
```

---

#### ⚡ THREAD B — Marketing Asset Agent (Hours 4:00–7:00)

**Prompt 2B:**

```
In /server/agents/marketingAgent.ts, build the Marketing Asset Agent.

Function signature:
  async function runMarketingAgent(projectId: string): Promise<void>

LOGIC:
1. Fetch the GTM project from DB.
2. Update marketing_agent_status to "running".

3. Make ONE Anthropic API call using multi-tool calling to generate
   all assets in a single request:
   - model: "claude-sonnet-4-20250514"
   - max_tokens: 6000
   - System prompt:
       "You are an elite B2B marketing strategist. Generate a complete
        marketing asset package for the product described. Return ONLY
        a valid JSON object with exactly these keys:
        {
          positioningStatement: string (2 sentences max),
          targetPersona: { name, role, company_size, painPoints[], goals[] },
          pricingRecommendation: { model, tiers: [{name, price, features[]}] },
          metaAdCopy: { headline, primaryText, callToAction },
          coldEmailSequence: [
            { subject, body, send_day: 1 },
            { subject, body, send_day: 3 },
            { subject, body, send_day: 7 }
          ],
          blogPostOutline: { title, sections: [{ heading, keyPoints[] }] },
          socialPost: { linkedin: string, twitter: string }
        }"
   - User message: "Product: [productName]. Description: [productDescription].
       Target audience: [targetAudience]. Budget: [budget]."

4. Parse the JSON. Insert marketing_assets rows for each asset type:
   - meta_ad_copy       → content = JSON.stringify(metaAdCopy)
   - cold_email_sequence → content = JSON.stringify(coldEmailSequence)
   - blog_post           → content = JSON.stringify(blogPostOutline)
   - social_post         → content = JSON.stringify(socialPost)
   - positioning_doc     → content = positioningStatement

5. Update gtm_projects with positioningStatement, targetPersona,
   pricingRecommendation fields.

6. Update marketing_agent_status to "completed".
7. Check if all 3 agents complete → set status to "awaiting_approval".
```

---

#### ⚡ THREAD C — Landing Page Agent (Hours 4:00–7:00)

**Prompt 2C:**

```
In /server/agents/landingPageAgent.ts, build the Landing Page Builder Agent.

Function signature:
  async function runLandingPageAgent(projectId: string): Promise<void>

LOGIC:
1. Fetch project from DB.
2. Update landing_page_agent_status to "running".

3. Call Anthropic API:
   - model: "claude-sonnet-4-20250514"
   - max_tokens: 8000
   - System prompt:
       "You are an expert frontend developer specializing in high-converting
        SaaS landing pages. Generate a complete, self-contained HTML file
        with embedded Tailwind CSS (via CDN) and minimal vanilla JS.
        The landing page must include:
        1. Hero section with headline, subheadline, and email capture form
        2. Problem/Solution section (3 pain points → 3 solutions)
        3. Features grid (6 features with icons using emoji)
        4. Pricing table with 3 tiers (Free/Pro/Enterprise)
        5. Social proof section (3 placeholder testimonials)
        6. CTA footer with email signup
        Make it mobile-responsive. Use a professional dark color scheme
        with violet/purple accents. Return ONLY the raw HTML — no markdown,
        no explanation, no code fences."
   - User message: "Company: [productName]. Description: [productDescription].
       Target customer: [targetAudience]."

4. Save the HTML string as a marketing_asset row:
   - asset_type: "landing_page_html"
   - title: "[productName] Launch Page v1"
   - content: <the full HTML string>

5. Update landing_page_agent_status to "completed".
6. Check if all 3 agents complete → set status to "awaiting_approval".

IMPORTANT: The completion check in steps 6 of ALL THREE agents should
use a DB transaction with SELECT FOR UPDATE to avoid race conditions
when checking if all agents are done simultaneously.
```

---

#### ⚡ THREAD D — Orchestrator Controller (Hours 7:00–9:00)

**Prompt 2D (after all 3 agent files exist):**

```
In /server/orchestrator.ts, build the main orchestration controller
that ties together all three agents.

This function is called by the POST /api/projects/:id/orchestrate endpoint:

  export async function orchestrateGTMProject(projectId: string): Promise<void>

LOGIC:
1. Set project status to "processing" and processingStartedAt to now().

2. Launch all three agents in parallel using Promise.allSettled:
   Promise.allSettled([
     runCompetitorAgent(projectId),
     runMarketingAgent(projectId),
     runLandingPageAgent(projectId),
   ])

3. When allSettled resolves:
   - Record processingCompletedAt and calculate processingDurationMs.
   - If any agent failed, set status to "failed" and log which one.
   - If all succeeded, status is already "awaiting_approval"
     (set by the last completing agent).

4. Export this function and import it in the route handler.
   The route must call orchestrateGTMProject without await so the
   HTTP response returns 202 immediately.

Also create /server/agents/index.ts that re-exports all three agent
functions for clean imports.
```

---

### 3.5 PHASE 3 — UI Polish & Mobile PWA (Hour 10:00–16:00)

**Open 2 threads simultaneously.**

---

#### ⚡ THREAD A — Dashboard Data Integration (Hours 10:00–13:00)

**Prompt 3A:**

```
Wire up the React frontend to the live backend APIs.

TASKS:
1. In /client/src/api/index.ts, create typed API functions using axios:
   - createProject(data) → POST /api/projects
   - getProjects() → GET /api/projects
   - getProject(id) → GET /api/projects/:id
   - orchestrateProject(id) → POST /api/projects/:id/orchestrate
   - approveProject(id) → PUT /api/projects/:id/approve
   - getAssets(id) → GET /api/projects/:id/assets
   - approveAsset(projectId, assetId) → PUT /api/projects/:id/assets/:assetId

2. In the /projects/:id page:
   - Use useQuery to fetch project + assets
   - Use useEventSource (custom hook) to subscribe to
     GET /api/projects/:id/status SSE stream
   - Map SSE events to live AgentKanbanBoard updates
   - When a competitor_data array is returned, render CompetitorMatrix
     with a Recharts grouped bar chart comparing pricing tiers
   - When assets exist, render each AssetCard in tabs by asset_type
   - When status === "awaiting_approval", show HumanApprovalGate modal

3. The new project form (/projects/new) should be a 3-step wizard:
   Step 1: Product name + description
   Step 2: Target audience + website URL
   Step 3: Budget + launch date + confirm
   On submit: createProject → then immediately orchestrateProject
   → redirect to /projects/:id

4. Add a live timer on the project detail page showing elapsed
   processing time since processingStartedAt.
```

---

#### ⚡ THREAD B — Mobile PWA Build (Hours 10:00–13:00)

**Prompt 3B:**

```
Build the mobile PWA version of the approval interface at
/projects/:id/mobile.

REQUIREMENTS:
1. Install vite-plugin-pwa and configure in vite.config.ts with:
   - name: "LaunchFlow AI"
   - short_name: "LaunchFlow"
   - theme_color: "#7c3aed"
   - background_color: "#0f172a"
   - display: "standalone"
   - Add a manifest.json and basic icon set

2. The /projects/:id/mobile page must show:
   - Header: project name + status badge
   - Progress section: 3 circular rings (one per agent) showing
     idle/running/completed states with color transitions
   - Summary card: positioning statement (once available)
   - Quick actions:
     → "View Full Dashboard" → opens /projects/:id in browser
     → "Approve Strategy" → triggers the approval API (with
        confirmation dialog, not the type-APPROVE modal)
     → "Reject & Re-run" → resets project to pending
   - Asset preview: scrollable list of asset titles only,
     tap to expand content

3. All touch targets must be minimum 48x48px.
4. Use bottom navigation bar for mobile instead of sidebar.
5. Test layout using the Replit mobile preview QR code.
   Ensure no horizontal overflow on 375px viewport.
```

---

### 3.6 PHASE 4 — Security, Testing & Story (Hour 16:00–24:00)

**Sequential, one thread at a time.**

---

**Prompt 4.1 — Security Audit Agent (Hours 16:00–18:00)**

```
Add a Security Audit Agent to /server/agents/securityAgent.ts.

This agent runs AFTER human approval (when user clicks "Approve & Deploy"):

  async function runSecurityAudit(projectId: string): Promise<string>
  → Returns: "PASS" | "WARN: [issues]" | "FAIL: [critical issues]"

It should call Claude with a prompt that:
1. Fetches the generated landing page HTML from marketing_assets.
2. Asks Claude to check for:
   - XSS vulnerabilities in form handlers
   - Missing Content-Security-Policy headers
   - Exposed sensitive data patterns in the HTML
   - Excessive agent permissions (no external API calls hardcoded)
3. Returns a structured JSON { status, issues[], recommendations[] }

Integrate this into the approval flow:
- POST /api/projects/:id/approve runs security audit FIRST.
- If "FAIL", return 400 with the issues. Do not mark as approved.
- If "PASS" or "WARN", mark as approved and return 200.
- Surface the audit result in the HumanApprovalGate modal before
  the user confirms.
```

---

**Prompt 4.2 — End-to-End Test Run (Hours 18:00–20:00)**

```
Run a complete end-to-end test of the LaunchFlow AI system using
these 3 dummy product inputs. For each, create a project and
trigger orchestration. Verify:

Test 1: { productName: "Stackly", productDescription: "A project
  management tool for remote engineering teams", targetAudience:
  "CTOs and Engineering Managers at 50-500 person companies" }

Test 2: { productName: "NourishAI", productDescription: "AI-powered
  meal planning for busy parents", targetAudience: "Parents aged
  28-45 with children under 12" }

Test 3: { productName: "LegalDraft Pro", productDescription:
  "Automated contract drafting for freelancers", targetAudience:
  "Freelancers and solo consultants billing over $5k/month" }

For each test, confirm:
✅ All 3 agents complete without error
✅ competitor_data table has 3-5 rows per project
✅ marketing_assets table has 5 rows per project
✅ landing_page_html renders correctly at /preview/:id
✅ Status transitions: pending → processing → awaiting_approval
✅ Human approval gate blocks deployment without manual confirm
✅ Security audit runs and passes

Fix any failures using the Auto Rollback checkpoint system.
Report final test results.
```

---

**Prompt 4.3 — Final Polish & Deployment (Hours 20:00–23:00)**

```
Final pre-submission polish for LaunchFlow AI:

1. INFINITE CANVAS REVIEW:
   Open the Infinite Canvas. Check the /projects/:id dashboard at
   1440px, 1024px, and 768px breakpoints. Fix any visual overflow,
   misaligned grids, or truncated text without touching JS logic —
   use direct DOM manipulation in the canvas.

2. LOADING STATES:
   Add skeleton loaders (animated pulse effect) for:
   - Project list while fetching
   - Competitor matrix while agents run
   - Asset cards while agents run
   Replace all "Loading..." text with proper shadcn/ui Skeleton components.

3. ERROR BOUNDARIES:
   Wrap the /projects/:id page in a React ErrorBoundary that shows
   a friendly "Something went wrong — your data is safe" message
   with a retry button instead of crashing.

4. PRODUCTION DEPLOY:
   Run: replit deployments create --type autoscale
   Assign a custom .replit.app subdomain: launchflow-ai
   Verify the deployed URL loads and auth works correctly.
   Run the Test 1 (Stackly) flow on the deployed production URL.

5. OUTPUT: Give me the final production URL and confirm all
   systems are live.
```

---

## SECTION 4 — EXECUTION TIMELINE SUMMARY

```
HOUR  00:00 ──── Bootstrap (Sequential, Single Thread)
      00:30 ──┬─ THREAD A: Backend API + Auth
              └─ THREAD B: React Frontend Shell
      04:00 ──┬─ THREAD A: Competitor Intelligence Agent
              ├─ THREAD B: Marketing Asset Agent
              └─ THREAD C: Landing Page Agent
      07:00 ──── THREAD D: Orchestrator Controller
      10:00 ──┬─ THREAD A: Dashboard Data Integration
              └─ THREAD B: Mobile PWA Build
      16:00 ──── Security Audit Agent
      18:00 ──── End-to-End Test Run
      20:00 ──── Final Polish + Production Deploy
      23:00 ──── 🎬 VIDEO RECORDING (narrative demo)
      23:45 ──── 📬 SUBMISSION via Buildathon portal
```

---

## SECTION 5 — JUDGING CRITERIA ALIGNMENT MAP

| Judging Criterion | How LaunchFlow AI Addresses It |
|---|---|
| **Progress (Delta)** | Three AI agents run in parallel from zero → full GTM strategy in minutes. The Kanban board makes this visually undeniable to judges. |
| **Execution Quality** | Typed APIs, Drizzle ORM, error boundaries, skeleton loaders, security audit, mobile PWA — all production-grade, zero broken states. |
| **Story / Impact** | Solves the documented $X-billion SMB pain of GTM planning taking weeks. Human-in-the-loop approval directly addresses 2026's "excessive agency" security crisis. The demo video shows real agents working live. |

---

## SECTION 6 — CRITICAL RISK MITIGATIONS

| Risk | Mitigation |
|---|---|
| Agent returns malformed JSON | Wrap all Anthropic calls in try/catch + JSON.parse inside try. Fallback: re-prompt once with "Fix and return valid JSON only." |
| Parallel agents cause DB race condition | Use `SELECT FOR UPDATE` transaction in the "all agents complete" check. |
| Rate limit on Anthropic API | All 3 agents share one API key but call sequentially within their own logic. Stagger start times by 500ms in `Promise.allSettled` wrapper. |
| Frontend crashes during live demo | React ErrorBoundary on all route pages. Auto Rollback enabled on the last stable checkpoint before Phase 3 begins. |
| Replit deploy cold start | Use `autoscale` deployment type. Keep one warm instance with a /health endpoint pinged every 5 minutes. |
| Running out of time | Mobile PWA (Prompt 3B) is the first feature to drop if behind schedule. Landing Page Agent (Prompt 2C) output can be simplified to a static HTML string if needed. |

---

*Generated for Replit RepliCon Buildathon 10 — May 2, 2026*
*LaunchFlow AI · Lead Architect Technical Brief · v1.0*
