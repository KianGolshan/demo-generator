# DemoForge — Architecture Working Memory

## Project Overview
**DemoForge** — transforms vibe-coded projects (URL, screenshots, GitHub repo) into polished 30–90s product demo MP4 videos using Remotion + Claude AI.

Target users: indie hackers, AI-assisted builders, solo founders ("vibe coders").

---

## Architecture Decisions

### Framework
- **Next.js 14 App Router** — co-locates API routes with UI, strong TypeScript support, Vercel-native
- All API logic lives in `app/api/` as Route Handlers (not Pages Router API routes)
- Server Components used for data fetching; Client Components for interactive UI

### Database
- **Supabase Postgres** as the database host
- **Prisma** as the ORM for type-safe queries and migrations
- Rationale: Prisma gives us a clear schema-as-code, migration history, and generated types. Supabase gives us managed Postgres + Auth + Storage in one.

### Auth
- **Supabase Auth** — GitHub OAuth (primary) + magic link (fallback)
- Session stored in Supabase; server-side access via `createServerClient` from `@supabase/ssr`
- Middleware handles session refresh on every request

### File Storage
- **Supabase Storage** for screenshots and rendered MP4s
- Bucket: `screenshots` — uploaded by users
- Bucket: `videos` — rendered MP4 output
- Files accessed via signed URLs (1hr expiry for videos, public read for screenshots)

### Video Rendering
- **Remotion** for composing and rendering demo videos
- `@remotion/player` for in-browser preview (Client Component)
- `@remotion/renderer` (`renderMedia()`) for server-side MP4 export
- ⚠️ KNOWN SCALING CONCERN: Remotion server-side render is CPU-intensive. In v1, it runs in the same Next.js process. For production scale, this needs a separate render worker (Lambda or dedicated Node service).
- Remotion components live in `src/remotion/`

### AI Integration
- **Anthropic Claude API** (`claude-sonnet-4-20250514`)
- All Claude calls wrapped in Zod validation of output JSON
- System prompts are exact copies from spec — do not paraphrase
- `max_tokens: 2000` for config generation, `1500` for code summaries
- All calls logged with token counts + latency in dev

### GitHub Integration
- **Octokit** (REST) for repo tree traversal and file content fetching
- GitHub OAuth token stored in Supabase session metadata

---

## Data Models

```ts
interface CodeSummary {
  stack: {
    frontend?: string;
    backend?: string;
    aiProviders?: string[];
    databases?: string[];
  };
  routes: { path: string; description: string }[];
  features: string[];
  aiUsage: string[];
}

interface DemoScene {
  type: "intro" | "feature" | "outro";
  durationSeconds: number;
  screenshotId?: string;
  headline: string;
  body: string[];
  cta?: string;
  technicalNote?: string;
}

interface DemoConfig {
  title: string;
  tagline: string;
  theme: "clean" | "cyber" | "playful";
  aspectRatio: "16:9" | "9:16";
  scenes: DemoScene[];
}

interface DemoProject {
  id: string;
  userId: string;
  projectName: string;
  tagline: string;
  description: string;
  sourceType: "url" | "screenshots" | "repo+url" | "repo+screenshots";
  sourceUrl?: string;
  screenshotUrls: string[];
  stylePreset: "clean" | "cyber" | "playful";
  features: { title: string; description: string }[];
  codeSummary?: CodeSummary;
  demoConfig?: DemoConfig;
  renderStatus: "draft" | "config_generated" | "rendering" | "ready" | "failed";
  videoUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Prisma Schema (planned)

```prisma
model DemoProject {
  id             String   @id @default(cuid())
  userId         String
  projectName    String
  tagline        String   @default("")
  description    String   @default("")
  sourceType     String   // "url" | "screenshots" | "repo+url" | "repo+screenshots"
  sourceUrl      String?
  screenshotUrls Json     @default("[]")   // string[]
  stylePreset    String   @default("clean") // "clean" | "cyber" | "playful"
  features       Json     @default("[]")   // { title: string; description: string }[]
  codeSummary    Json?                      // CodeSummary
  demoConfig     Json?                      // DemoConfig
  renderStatus   String   @default("draft")
  videoUrl       String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

---

## API Contract

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/demos` | Create DemoProject (draft) |
| GET | `/api/demos/[id]` | Fetch single DemoProject |
| PATCH | `/api/demos/[id]` | Update fields |
| POST | `/api/demos/[id]/screenshots` | Upload screenshots → Supabase Storage |
| POST | `/api/demos/[id]/analyze-repo` | Analyze GitHub repo → save CodeSummary |
| POST | `/api/demos/[id]/generate-config` | Claude → generate DemoConfig |
| POST | `/api/demos/[id]/render` | Trigger Remotion render |
| GET | `/api/demos/[id]/render/status` | Poll render status |

All endpoints:
- Validate input with Zod
- Return `{ error: string; code: string }` on failure
- Protected by Supabase session auth (except render/status)

---

## Environment Variables

See `.env.example` for all keys. Required:
- `DATABASE_URL` — Supabase Postgres connection string (pooled)
- `DIRECT_URL` — Supabase Postgres direct connection (for migrations)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Server-only service role key
- `ANTHROPIC_API_KEY` — Claude API key
- `GITHUB_CLIENT_ID` — GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` — GitHub OAuth app client secret

---

## Completed Slices

- [ ] Slice 1 — Project scaffold + data layer
- [ ] Slice 2 — Auth + project creation
- [ ] Slice 3 — Repo analysis pipeline
- [ ] Slice 4 — Claude demo config generation
- [ ] Slice 5 — Remotion video engine
- [ ] Slice 6 — Render orchestration
- [ ] Slice 7 — Dashboard + polish

---

## Open Questions / Assumptions

1. **Assumptions made:** Supabase project will be created separately by the user; we need the connection strings from their dashboard.
2. **Prisma + Supabase pooling:** Using `DATABASE_URL` with PgBouncer pooler for runtime queries; `DIRECT_URL` for migrations (Prisma requirement).
3. **Remotion render in v1:** Running server-side render in Next.js API route. Acceptable for dev/demo, must be extracted for production scale.
4. **Screenshot upload:** Max 6 screenshots, stored in Supabase Storage `screenshots/[userId]/[demoId]/[filename]` path.
5. **GitHub OAuth for repo analysis:** We use the GitHub token from Supabase Auth session — user must log in with GitHub to use repo analysis.
6. **Video aspect ratio:** Compositions rendered at 1920×1080 (16:9) or 1080×1920 (9:16) at 30fps.

---

## Key File Structure

```
demo-generator/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── demos/
│   │   │       ├── route.ts                    # POST /api/demos
│   │   │       └── [id]/
│   │   │           ├── route.ts                # GET, PATCH
│   │   │           ├── screenshots/route.ts
│   │   │           ├── analyze-repo/route.ts
│   │   │           ├── generate-config/route.ts
│   │   │           └── render/
│   │   │               ├── route.ts
│   │   │               └── status/route.ts
│   │   ├── demos/
│   │   │   ├── page.tsx                        # Dashboard
│   │   │   ├── new/page.tsx                    # Creation wizard
│   │   │   └── [id]/page.tsx                   # Demo detail
│   │   ├── layout.tsx
│   │   └── page.tsx                            # Landing / redirect
│   ├── components/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                       # Browser client
│   │   │   └── server.ts                       # Server client
│   │   ├── prisma.ts                           # Prisma singleton
│   │   └── types.ts                            # All TypeScript interfaces
│   └── remotion/
│       ├── Root.tsx
│       ├── DemoVideo.tsx
│       ├── scenes/
│       │   ├── IntroScene.tsx
│       │   ├── FeatureScene.tsx
│       │   └── OutroScene.tsx
│       └── index.ts
├── prisma/
│   └── schema.prisma
├── .env.example
├── .env.local                                  # gitignored
└── CLAUDE.md
```
