# Hackathon Stack Reference
## Zero-setup choices for 24-hour builds on Replit

| Need | Choice | Why |
|---|---|---|
| Auth | Replit Auth (OIDC) | 0 config, instant SSO |
| Database | Replit PostgreSQL + Drizzle ORM | Auto-provisioned, type-safe |
| Backend | Express.js + TypeScript | Fast setup, massive ecosystem |
| Frontend | React + Vite + Tailwind | HMR, utility-first, no design debt |
| AI SDK | @anthropic-ai/sdk | Streaming, tools, multi-modal |
| Server state | TanStack Query | Caching, polling, mutations |
| Real-time | Server-Sent Events | Simpler than WebSockets, HTTP native |
| Charts | Recharts | Works with React, declarative |
| Icons | lucide-react | Consistent, tree-shakeable |
| Forms | React Hook Form + Zod | Type-safe validation |
| Deploy | Replit Deployments (autoscale) | One command, custom domain |
| Mobile | Vite PWA Plugin | Install prompt, offline, home screen |

## Install everything in one shot
```bash
# Backend
cd server && npm install express cors dotenv express-session uuid zod \
  drizzle-orm drizzle-kit pg @anthropic-ai/sdk typescript ts-node \
  @types/express @types/cors @types/node @types/uuid @types/express-session \
  @types/pg compression

# Frontend  
cd client && npm install react react-dom react-router-dom vite typescript \
  @vitejs/plugin-react tailwindcss postcss autoprefixer \
  @tanstack/react-query axios recharts lucide-react \
  react-hook-form zod @hookform/resolvers vite-plugin-pwa qrcode.react
```

## Vite proxy config (avoids CORS in dev)
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true }
    }
  }
})
```

## Express production static serving
```typescript
// server/index.ts — serve React build in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}
```
