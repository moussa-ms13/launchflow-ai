# Changelog

## [1.0.0] — 2026-05-03

### 🚀 Initial Release — Built in 24 Hours at Replit Buildathon 10

#### Added
- **Competitor Intelligence Agent** — real-time web search via Claude Sonnet 4
  Researches 3–5 competitors, extracts pricing, weaknesses, sentiment scores
- **Marketing Asset Agent** — generates positioning, ad copy, 3-email cold
  sequence, LinkedIn/Twitter posts, blog outline in a single API call
- **Landing Page Agent** — full self-contained HTML with hero, pricing table,
  testimonials, email capture form
- **Parallel Orchestrator** — Promise.allSettled() launches all 3 agents
  simultaneously. SELECT FOR UPDATE prevents race conditions on completion
- **Human-in-the-Loop Approval Gate** — user must type "APPROVE" before
  any strategy is deployed. Security audit runs automatically first
- **Live Agent Kanban Board** — real-time via Server-Sent Events
  Cards: Idle → Running → Complete with animated states
- **Competitor Matrix Chart** — Recharts GroupedBarChart comparing pricing
- **Landing Page Preview** — sandboxed iframe via GET /api/projects/:id/preview
- **Live Elapsed Timer** — MM:SS counter from processingStartedAt
- **Dashboard Stats Row** — Total Projects, Approved, Assets, Time Saved
- **Mobile PWA** — manifest, bottom nav, all touch targets ≥ 48px
- **Shareable Links** — /projects/:id/share public read-only route
- **Replit Auth** — OIDC zero-config authentication
- **PostgreSQL + Drizzle ORM** — 4 tables, full foreign key constraints
- **Production Deploy** — Replit autoscale at go-to-market--moussams777.replit.app

#### Security
- All secrets in environment variables, never hardcoded
- Agents cannot deploy without explicit human confirmation
- Generated HTML sandboxed in iframes
- Database-level locking prevents race conditions

## [Unreleased]
### Planned
- MCP integration with Salesforce and HubSpot
- Agentic RAG for internal document search
- Stripe usage-based billing
- A/B landing page variant generator
