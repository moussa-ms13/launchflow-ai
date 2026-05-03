# Contributing to LaunchFlow AI

This project uses **Structured Systems Design (SSD)**. Before writing code:

1. Open an issue describing what you'll build and which files you'll touch
2. Fork → branch: `feat/your-feature` or `fix/bug-name`
3. Follow the rules below
4. Open a PR with acceptance criteria checked

## Branch Naming
```
feat/   → new feature
fix/    → bug fix
docs/   → documentation only
perf/   → performance
refactor/ → restructure, no behavior change
```

## Commit Format
```
type(scope): short description

Closes #issue-number
```
Types: feat, fix, docs, perf, refactor, test, chore

## Code Rules

**Agent functions must follow this contract:**
```typescript
export async function runXAgent(projectId: string): Promise<void> {
  try {
    // 1. Update status to "running"
    // 2. Do the work
    // 3. Save results to DB
    // 4. Update status to "completed"
    // 5. Call checkAllAgentsComplete()
  } catch (error) {
    // Update status to "error" — NEVER rethrow
    console.error(`[XAgent] Failed:`, error);
  }
}
```

**API endpoints must:**
- Validate input with Zod before DB operations
- Return `{ error: string }` on failure with correct status code
- Use requireAuth middleware (except /api/auth/user)

**React components must:**
- Use TanStack Query for server state
- Tailwind classes only, no inline styles
- Touch targets minimum 48x48px
- Export as default export

## PR Description Template
```
## What this changes
## Files modified
## How to test
## Acceptance criteria
- [ ]
- [ ]
```
