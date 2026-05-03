# Database Patterns Reference

## Drizzle ORM — Common Patterns

### Insert and return
```typescript
const [created] = await db.insert(table).values(data).returning();
```

### Update with condition
```typescript
await db.update(table)
  .set({ field: value, updatedAt: new Date() })
  .where(eq(table.id, id));
```

### Query with relations
```typescript
const project = await db.query.gtmProjects.findFirst({
  where: eq(gtmProjects.id, projectId),
  with: { competitorData: true, marketingAssets: true }
});
```

### Atomic status check (race condition safe)
```typescript
await db.transaction(async (tx) => {
  const [project] = await tx
    .select()
    .from(gtmProjects)
    .where(eq(gtmProjects.id, projectId))
    .for("update"); // SELECT FOR UPDATE

  const allDone =
    project.competitorAgentStatus === "completed" &&
    project.marketingAgentStatus === "completed" &&
    project.landingPageAgentStatus === "completed";

  if (allDone) {
    await tx.update(gtmProjects)
      .set({ status: "awaiting_approval" })
      .where(eq(gtmProjects.id, projectId));
  }
});
```

### Migration command
```bash
npx drizzle-kit push:pg    # push schema to DB (dev)
npx drizzle-kit generate   # generate SQL migration files (prod)
```

### Common column types
```typescript
uuid("id").defaultRandom().primaryKey()
varchar("name", { length: 255 }).notNull()
text("description")
integer("count").default(0)
boolean("active").default(true).notNull()
timestamp("created_at").defaultNow().notNull()
jsonb("metadata")                          // store arbitrary JSON
pgEnum("status", ["a","b","c"])
```
