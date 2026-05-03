<div align="center">

![Built in 24 Hours](https://img.shields.io/badge/Built%20in-24%20Hours-violet?style=for-the-badge)
![SSD Method](https://img.shields.io/badge/Method-SSD%20Vibe%20Coding-blueviolet?style=for-the-badge)
![Replit Buildathon](https://img.shields.io/badge/Replit-Buildathon%2010-orange?style=for-the-badge)
![Replit Agent 4](https://img.shields.io/badge/Replit%20Agent%204-blue?style=for-the-badge)

# ⚡ LaunchFlow AI

### Autonomous Go-To-Market Strategy Orchestrator

**3 AI agents. Parallel execution. Full GTM strategy in under 5 minutes.**

[🌐 Live Demo](https://go-to-market--moussams777.replit.app) · [📖 SSD Methodology](docs/SSD-METHODOLOGY.md)

</div>

---

## 📌 What Is This?

LaunchFlow AI is a B2B SaaS that automates the entire Go-To-Market planning
cycle using autonomous parallel AI agents. What traditionally takes a marketing
team **3 weeks** — competitor research, positioning, copywriting, landing page
design — LaunchFlow completes in **under 5 minutes**.

Built in **24 hours** at Replit RepliCon Buildathon 10 using **SSD**
(Structured Systems Design) — a production-grade methodology that goes far
beyond conventional vibe coding.

---

## 🎯 The Problem

- ⏳ Weeks lost researching competitors manually across dozens of tabs
- 📄 Fragmented tools — CRM, Notion, Figma, Docs — never in sync
- 💸 Expensive agencies just to write a landing page
- 🔁 Strategy outdated by launch day

**LaunchFlow AI eliminates this entirely.**

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 Competitor Intelligence Agent | Real-time web search · pricing · weaknesses · sentiment |
| ✍️ Marketing Asset Agent | Ad copy · 3-email sequence · social posts · positioning |
| 🌐 Landing Page Agent | Full HTML page — hero, pricing table, testimonials, CTA |
| 🔀 Parallel Orchestration | All 3 agents simultaneously via Promise.allSettled() |
| 🛡️ Human Approval Gate | Nothing deploys without explicit human confirmation |
| 📊 Live Kanban Board | Real-time agent status via Server-Sent Events |
| 📱 Mobile PWA | Full responsive · approve strategies from your phone |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────┐
│                  LaunchFlow AI                      │
│                                                     │
│  User Input ──▶ Orchestrator ──┬──▶ Competitor     │
│                                ├──▶ Marketing       │
│                                └──▶ Landing Page   │
│                                                     │
│  All 3 run in PARALLEL — isolated micro-VMs        │
│                                                     │
│  Output ──▶ Human Approval Gate ──▶ Deploy         │
└────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Frontend | React 18 + Vite + Tailwind CSS |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Replit Auth (OIDC) |
| AI | Replit Agent 4 + Web Search Tool |
| Real-time | Server-Sent Events |
| Deploy | Replit Autoscale |

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/moussa-ms13/launchflow-ai.git
cd launchflow-ai

# 2. Install
cd server && npm install
cd ../client && npm install

# 3. Configure
cp server/.env.example server/.env
# Edit .env with your DATABASE_URL and ANTHROPIC_API_KEY

# 4. Migrate DB
cd server && npx drizzle-kit push:pg

# 5. Run
npm run dev
# Backend :3000 · Frontend :5173
```

---

## 🧠 The SSD Methodology

> **Structured Systems Design (SSD)** — architecture-first AI development
> that produces production software, not throwaway prototypes.

### ❌ Traditional Vibe Coding
```
Idea → vague prompt → fix errors → repeat → prototype only
```

### ✅ SSD (Structured Systems Design)
```
Architecture → Dependency Graph → Parallel Prompts → Checkpoints → Ship
```

**5 SSD Principles applied here:**

**1. Architecture Before Prompts** — Full DB schema and API contracts
designed before any agent received a single instruction.

**2. Dependency Graph Parallelism** — Independent modules ran on separate
agent threads simultaneously, multiplying output velocity:
```
Layer 0: DB Schema (sequential)
Layer 1: Backend API || Frontend Shell (parallel x2)
Layer 2: Agent A || Agent B || Agent C (parallel x3)
Layer 3: UI Wiring || Mobile PWA (parallel x2)
Layer 4: Security + Deploy (sequential)
```

**3. File Ownership Boundaries** — Each thread owned exclusive directories.
No two threads touched the same file — zero merge conflicts.

**4. Acceptance-Criteria Prompts** — Every prompt ended with testable
success conditions. No vague "make it work" instructions.

**5. Checkpoint-Driven Development** — Mandatory 10-minute review every
2 hours to catch broken states before they compound.

📖 [Read the full SSD methodology →](docs/SSD-METHODOLOGY.md)

---

## 🤖 Agent Design

### Parallel Orchestration
```typescript
// Staggered 300ms to respect rate limits
// Promise.allSettled — never rejects
// SELECT FOR UPDATE prevents race conditions
Promise.allSettled([
  runCompetitorAgent(projectId),                        // t=0ms
  delay(300).then(() => runMarketingAgent(projectId)),  // t=300ms
  delay(600).then(() => runLandingPageAgent(projectId)) // t=600ms
])
```

### Agent Contracts
```typescript
// All agents follow this pattern — never throws
export async function runXAgent(projectId: string): Promise<void> {
  try {
    await updateStatus("running");
    const result = await callClaude(prompt);
    await saveToDB(result);
    await updateStatus("completed");
    await checkAllAgentsComplete(projectId);
  } catch (err) {
    await updateStatus("error");
    console.error(err); // never rethrow
  }
}
```

---

## 🔒 Security Design

### Human-in-the-Loop Architecture
```
Agent completes → status: "awaiting_approval"
       ↓
Human reviews all generated assets
       ↓
Security audit runs automatically
       ↓
Human types "APPROVE" to confirm
       ↓
Strategy deployed
```

This addresses the **2026 "Excessive Agency" security problem** —
AI agents with unconstrained permissions modifying data without oversight.

---

## 📁 Project Structure

```
launchflow-ai/
├── client/
│   └── src/
│       ├── components/
│       │   ├── AgentKanbanBoard.tsx
│       │   ├── CompetitorMatrix.tsx
│       │   ├── HumanApprovalGate.tsx
│       │   └── ...
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   └── ProjectDetail.tsx
│       └── hooks/
│           ├── useAgentStatus.ts
│           └── useElapsedTimer.ts
├── server/
│   ├── agents/
│   │   ├── competitorAgent.ts
│   │   ├── marketingAgent.ts
│   │   ├── landingPageAgent.ts
│   │   └── index.ts
│   ├── routes/
│   ├── orchestrator.ts
│   └── db.ts
├── shared/
│   └── schema.ts
└── docs/
    └── SSD-METHODOLOGY.md
```

---

## 📊 Performance

| Metric | Value |
|---|---|
| GTM strategy generation time | ~3–5 minutes |
| Competitors researched | 3–5 per project |
| Marketing assets generated | 5 per project |
| Parallel agents | 3 simultaneously |
| Code shipped in 24 hours | 268 files · 272 KB |
| Manual equivalent time | ~15–20 hours |

---

## 🗺️ Roadmap

- [ ] MCP integration — Salesforce, HubSpot, Meta Ads API
- [ ] Agentic RAG — search internal company documents
- [ ] Email campaign execution via SendGrid
- [ ] A/B test landing page variants
- [ ] Usage-based billing via Stripe
- [ ] Team workspaces with role permissions

---

## 🏆 Built At

**Replit RepliCon Buildathon 10** — May 2–3, 2026
$100,000+ prize pool · Partners: Google Cloud, Anthropic, RevenueCat

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

**Built with SSD · Powered by Claude · Deployed on Replit**

[🌐 Live App](https://go-to-market--moussams777.replit.app) · [⭐ Star this repo](https://github.com/moussa-ms13/launchflow-ai)

</div>
