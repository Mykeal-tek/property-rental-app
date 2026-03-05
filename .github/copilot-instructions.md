# AI Copilot Instructions

## Project Overview
Property Rental App—a full-stack rental marketplace with TypeScript, React, Express, and MySQL/Drizzle ORM. Landlords list properties; tenants browse and book. Authentication via OAuth (openId-based). Split architecture: `client/` (Vite+React), `server/` (Express+tRPC), `shared/` (types), `drizzle/` (schema+migrations).

## Architecture & Data Flow

### Core Stack
- **Frontend**: React 19 + Vite + Wouter (routing) + TailwindCSS v4 + Radix UI
- **Backend**: Express + tRPC (RPC framework) + Drizzle ORM
- **Database**: MySQL with Drizzle schema migrations
- **Client-Server**: tRPC bridges frontend/backend; `@trpc/react-query` handles async state on client

### Key Directories
- `client/src/` — React components, pages, hooks, tRPC integration (see `lib/trpc.ts`)
- `server/` — Express routes via tRPC routers, database operations, OAuth setup
- `server/_core/` — tRPC context, middleware (auth), cookies, OAuth, SDK bridge
- `drizzle/` — Database schema and migrations; run `pnpm db:push` to migrate
- `shared/` — Type exports and constants shared across client/server

### Data Flow Patterns
1. **User Auth**: OAuth callback → `server/_core/oauth.ts` → token creation → session cookie
2. **Protected Procedures**: tRPC middleware (`protectedProcedure`, `adminProcedure`) check `ctx.user` from request
3. **Database**: Drizzle ORM queries in `server/db.ts` called by tRPC mutations/queries
4. **Client Queries**: React components use `trpc.{router}.{procedure}.useQuery()` and `.useMutation()`

## Developer Workflows

### Key Commands
```bash
pnpm dev          # Start dev server (Vite + express watch via tsx)
pnpm build        # Vite client build + esbuild server bundle
pnpm start        # Run production bundle
pnpm check        # tsc --noEmit (type check only)
pnpm db:push      # Generate + migrate Drizzle schema
pnpm test         # vitest run (server tests only)
pnpm format       # Prettier format all files
```

### Dev Server
Runs on auto-detected port (default 3000) via `server/_core/index.ts`. In development, Vite serves client; in production, static files in `dist/`.

### Database Migrations
1. Edit `drizzle/schema.ts`
2. Run `pnpm db:push` to generate SQL migrations
3. Migrations auto-apply; snapshots saved to `drizzle/meta/`

### Type Checking
- Single shared `tsconfig.json` with path aliases: `@/*` → `client/src`, `@shared/*` → `shared`
- Run `pnpm check` before commits

## Project-Specific Conventions

### Procedure Authorization
- **publicProcedure**: No auth required
- **protectedProcedure**: Requires `ctx.user` (throws UNAUTHORIZED if missing)
- **adminProcedure**: Requires `ctx.user.role === 'admin'` (throws FORBIDDEN otherwise)

Example:
```typescript
// server/routers.ts
properties: router({
  create: protectedProcedure
    .input(propertySchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'landlord') throw new TRPCError({ code: 'FORBIDDEN' });
      return await db.createProperty({ ...input, landlordId: ctx.user.id });
    }),
})
```

### tRPC Patterns
- All procedures use Zod schema validation (e.g., `z.object({...})`)
- Return types inferred from resolvers; no manual types needed
- Use `superjson` transformer for Date/Map serialization across network

### Database Operations
- All queries in `server/db.ts` using Drizzle ORM
- Use `onDuplicateKeyUpdate` for upserts (MySQL-specific)
- User lookup: `getUserByOpenId()` (primary key during OAuth)

### Role-Based Access
Roles in `drizzle/schema.ts`: `'user' | 'admin' | 'landlord' | 'tenant'`. Check in procedure middleware or mutation logic.

## Integration Points

### OAuth Flow
1. Frontend redirects to OAuth provider
2. Provider calls `/api/oauth/callback?code=X&state=Y`
3. `server/_core/oauth.ts` exchanges code for token, fetches user info, upserts to DB, creates session cookie
4. Cookie stored in `COOKIE_NAME` (from `shared/const.ts`)

### Client-Side Auth
- `client/src/_core/hooks/useAuth.ts` — Custom hook for user state (check implementation)
- `ThemeContext.tsx` + `DashboardLayout.tsx` — Auth-aware layout patterns

### UI Component Library
- Radix UI primitives in `client/src/components/ui/` (pre-generated, do not edit)
- Custom components in `client/src/components/` (e.g., `DashboardLayout.tsx`, `AIChatBox.tsx`)
- Styling via TailwindCSS v4 + `tailwind-merge` for className utilities

### File Upload
- S3 integration via `@aws-sdk/client-s3` (see storage helpers in `server/storage.ts`)
- Presigned URLs for secure uploads

## Testing & Debugging

### Testing
- Tests in `server/**/*.test.ts` (vitest environment: node)
- See `server/auth.logout.test.ts` for example
- Run `pnpm test` (client tests not yet configured; UI tested manually)

### Debugging
- Manus debug collector active in dev (see `vite.config.ts` for `.manus-logs/` setup)
- Browser console logs collected; file size auto-trimmed at 1MB
- tRPC errors logged with code + message; check server console for stack traces

## Important Notes

- **No `.env` file in repo**: `DATABASE_URL`, `BUILT_IN_FORGE_API_*` required at runtime
- **Patches**: See `patches/wouter@3.7.1.patch` for routing fixes; applied via pnpm
- **Shared Types**: Import from `@shared/*` in both client/server; do not duplicate
- **tRPC vs. REST**: All API calls go through tRPC (no direct REST endpoints except OAuth callback)
