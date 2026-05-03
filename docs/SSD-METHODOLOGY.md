# Structured Systems Design (SSD)
## A Production-Grade Evolution of Vibe Coding

---

## What is SSD?

**Structured Systems Design (SSD)** is a disciplined methodology for building
production software using AI coding agents. It combines the speed of
AI-assisted development with the rigor of traditional software architecture.

The core insight: AI agents are only as good as the instructions they receive.
Vague prompts produce vague code. Precise architectural thinking produces
shippable software.

---

## SSD vs. Vibe Coding

| Dimension        | Vibe Coding                        | SSD                                      |
|------------------|------------------------------------|------------------------------------------|
| Starting point   | "Build me an app"                  | Complete DB schema + API contracts       |
| Agent prompts    | Conversational, vague              | File paths + signatures + data shapes    |
| Parallelism      | One thread, sequential             | Dependency graph → parallel layers       |
| Error handling   | Fix as they appear                 | Specified per-function in the prompt     |
| Integration      | Hope it works                      | Acceptance criteria per prompt           |
| Result           | Demo prototype                     | Production-deployable software           |

---

## The 5 SSD Principles

### 1. Architecture Before Prompts
Design the full system before touching an agent:
- Database schema with exact types and constraints
- API endpoint contracts (method, path, body, response)
- Component interfaces (props, events, state)
- Dependency relationships between modules

### 2. Dependency Graph Parallelism
Map every module to a layer based on its dependencies:
```
Layer 0 (sequential):   Modules with no dependencies
Layer 1 (parallel):     Modules that only depend on Layer 0
Layer 2 (parallel):     Modules that only depend on Layer 0-1
```
Each layer's modules run in parallel agent threads simultaneously.

### 3. File Ownership Boundaries
Assign each parallel thread exclusive ownership of specific
directories or files. No two threads edit the same file simultaneously.
This eliminates merge conflicts and broken states.

### 4. Acceptance-Criteria Prompts
Every prompt ends with a testable success condition:

❌ Vague: "Make sure it works"
✅ SSD:   "Show the server terminal output, the DB migration result,
           and a successful GET /api/auth/user returning a user object"

### 5. Checkpoint-Driven Development
Mandatory 10-minute review every 2 hours:
- Is the app running without errors?
- Can I complete the core user flow manually?
- Are DB migrations applied and verified?
- Do I have a working deploy URL?
- Am I on track with the time budget?

---

## The SSD Prompt Anatomy

Every SSD prompt has 5 required parts:

```
ROLE        → "You are building [X] for [project]"
CONTEXT     → Existing files, tech stack, what's already done
TASK        → Exact file paths, function names, data shapes
CONSTRAINTS → What NOT to touch, rules to follow
ACCEPTANCE  → Testable success conditions
```

---

## Applied to LaunchFlow AI

Dependency graph used in this 24-hour build:

```
[DB Schema]                                    Layer 0 (sequential)
      |
[Backend API] || [Frontend Shell]              Layer 1 (parallel x2)
      |
[Competitor Agent] || [Marketing Agent]
|| [Landing Page Agent]                        Layer 2 (parallel x3)
      |
[UI Data Wiring] || [Mobile PWA]               Layer 3 (parallel x2)
      |
[Security] -> [Testing] -> [Deploy]            Layer 4 (sequential)
```

Result: 268 files, 272 KB of code, production-deployed in 24 hours.

---

*SSD was developed and applied at Replit RepliCon Buildathon 10, May 2026.*
