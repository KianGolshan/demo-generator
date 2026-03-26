# DemoForge

**Point it at a GitHub repo. Get a polished 40–65 second MP4 product demo video — powered by Claude AI and Remotion. No video editing, no screen recording, no designer.**

Target users: indie hackers, AI-assisted builders, solo founders who want to ship demos as fast as they ship code.

---

## How It Works

1. **Create a project** — name, tagline, description, GitHub repo URL, optional reference screenshots
2. **Analyze repo** — Octokit reads the top 25 repo files (README, package.json, routes, API handlers) → Claude extracts stack, routes, features, and saves real code snippets to DB
3. **Generate composition** — Claude reads the code snippets and **writes a complete custom Remotion TSX file** for that specific app using the Go-Git-It methodology: extract exact field names → build app-specific UI components → simulate the real interface with React
4. **Render** — Remotion bundles and renders the TSX → MP4 uploaded to Supabase Storage
5. **Iterate** — describe a change in plain English → Claude rewrites the video code → re-render
6. **Share** — public shareable page at `/share/[id]`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| AI | Anthropic Claude `claude-sonnet-4-6` |
| Video | Remotion v4 (`@remotion/renderer`, `@remotion/bundler`) |
| Auth | Supabase Auth (GitHub OAuth + magic link) |
| Database | Supabase Postgres + Prisma 7 (PrismaPg adapter) |
| Storage | Supabase Storage (`screenshots` + `videos` buckets) |
| Repo Analysis | Octokit REST API |
| Styling | Tailwind CSS + custom dark design system |
| Validation | Zod v4 |

---

## Project Structure

```
src/
├── app/
│   ├── api/demos/
│   │   ├── route.ts                          # POST /api/demos — create project
│   │   └── [id]/
│   │       ├── route.ts                      # GET / PATCH / DELETE
│   │       ├── screenshots/route.ts          # Multipart upload → Supabase Storage
│   │       ├── analyze-repo/route.ts         # Octokit + Claude → CodeSummary
│   │       ├── generate-composition/route.ts # Claude writes full Remotion TSX ← core
│   │       ├── iterate/route.ts              # Claude modifies existing TSX
│   │       └── render/
│   │           ├── route.ts                  # Bundle + renderMedia + upload MP4
│   │           └── status/route.ts           # Poll render progress
│   ├── api/settings/route.ts                 # GET / PATCH user profile (BYOK)
│   ├── demos/
│   │   ├── page.tsx                          # Dashboard
│   │   ├── new/page.tsx                      # 3-step creation wizard
│   │   └── [id]/page.tsx                     # Demo detail page
│   ├── settings/page.tsx                     # API key management
│   ├── share/[id]/page.tsx                   # Public shareable video page (no auth)
│   ├── login/                                # GitHub OAuth + magic link
│   └── auth/callback/route.ts                # OAuth code exchange
├── components/
│   ├── GenerateCompositionPanel.tsx          # Generate button + code preview
│   ├── IteratePanel.tsx                      # Plain-language iteration UI
│   ├── RenderPanel.tsx                       # Render trigger + polling + video player
│   ├── RepoPanel.tsx                         # Repo input + CodeSummary display
│   ├── ApiKeyForm.tsx                        # BYOK key input
│   ├── Nav.tsx                               # Global nav
│   └── Toast.tsx                             # Toast notifications
├── lib/
│   ├── claude.ts                             # callClaude() — optional BYOK apiKey param
│   ├── encrypt.ts                            # AES-256-GCM for user API keys at rest
│   ├── userProfile.ts                        # BYOK helpers + atomic free gen reservation
│   ├── prisma.ts                             # Prisma singleton (PrismaPg adapter)
│   └── supabase/                             # Server + admin Supabase clients
├── remotion/
│   ├── GeneratedDemo.tsx                     # Auto-generated per render (gitignored)
│   ├── GeneratedDemoRoot.tsx                 # Remotion composition registration
│   └── generated-entry.ts                   # Remotion bundle entry point
└── types/index.ts                            # Shared TypeScript interfaces
```

---

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/demos` | Create project (draft) |
| GET | `/api/demos/[id]` | Fetch project |
| PATCH | `/api/demos/[id]` | Update fields |
| DELETE | `/api/demos/[id]` | Delete project + storage cleanup |
| POST | `/api/demos/[id]/screenshots` | Upload reference screenshots |
| POST | `/api/demos/[id]/analyze-repo` | Read GitHub repo → save CodeSummary |
| POST | `/api/demos/[id]/generate-composition` | Claude writes Remotion TSX |
| POST | `/api/demos/[id]/iterate` | Claude modifies existing TSX |
| POST | `/api/demos/[id]/render` | Bundle + render → upload MP4 |
| GET | `/api/demos/[id]/render/status` | Poll render status |
| GET | `/api/settings` | Get user profile (hasApiKey, free gen count) |
| PATCH | `/api/settings` | Save user's Anthropic API key |

---

## BYOK (Bring Your Own Key)

Each user gets **1 free generation** (analyze + generate). After that, they need to add their own Anthropic API key in Settings.

- Keys are encrypted with AES-256-GCM using `API_KEY_ENCRYPTION_SECRET` before storing in DB
- Free generation reservation uses a Prisma transaction to prevent TOCTOU races
- Iteration (`/iterate`) always requires the user's own key — it never uses the app key

---

## The Video Generation Approach

Claude follows three steps before writing any code:

1. **Extract** — pull exact field names, column headers, button labels, domain terminology from code snippets
2. **Build app-specific components** — custom React that simulates the real UI (search form with actual placeholder text, results table with actual column names)
3. **Screenshots are reference only** — never shown in video. Claude uses them to understand layout, then reproduces it with code

The result looks like a human hand-crafted it for that specific app — because Claude did.

---

## Local Development

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key
- A [GitHub OAuth App](https://github.com/settings/developers)

### 1. Clone and install

```bash
git clone https://github.com/KianGolshan/demo-generator.git
cd demo-generator
npm install
```

### 2. Environment variables

Copy `.env` and fill in all values:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                    # Pooler connection, port 6543
DIRECT_URL=                      # Direct connection, port 5432
ANTHROPIC_API_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3001
API_KEY_ENCRYPTION_SECRET=       # 64-char hex — generate with command below
```

Generate the encryption secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Database setup

```bash
npx prisma db push
npx prisma generate
```

### 4. Supabase Storage

Create two **public** buckets in Supabase Dashboard → Storage:
- `screenshots`
- `videos`

### 5. Run

```bash
# Note: npm run dev has a PATH quirk with Remotion native binaries
PORT=3001 node node_modules/next/dist/bin/next dev
```

Open [http://localhost:3001](http://localhost:3001).

---

## Render Pipeline

```
POST /api/demos/[id]/render
  └─ Checks: not already rendering (409 if so)
  └─ Sets renderStatus = "rendering", returns 202 immediately
  └─ void runGeneratedRender()  ← detached background task
       ├─ Writes generatedCode → src/remotion/GeneratedDemo.tsx
       ├─ bundle(generated-entry.ts) — rspack bundles the composition
       ├─ selectComposition("GeneratedDemo") — reads exports for dimensions/duration
       ├─ renderMedia() → /tmp/demoforge-gen-{id}.mp4
       ├─ Upload to Supabase Storage: videos/{userId}/{demoId}/demo.mp4
       └─ DB update: renderStatus = "ready" | "failed"

Client polls GET /api/demos/[id]/render/status every 2s
  └─ Shows indeterminate progress bar → video player on "ready"
```

> **Deployment note:** The background render task works on persistent Node servers (Railway, Render, VPS). On Vercel serverless the process is killed mid-render — needs Remotion Lambda for Vercel deployments.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `DATABASE_URL` | Postgres pooler connection string (port 6543) |
| `DIRECT_URL` | Postgres direct connection (port 5432, for migrations) |
| `ANTHROPIC_API_KEY` | Anthropic API key (app key — used for first free generation) |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `NEXT_PUBLIC_APP_URL` | App base URL (e.g. `http://localhost:3001`) |
| `API_KEY_ENCRYPTION_SECRET` | 64-char hex string for AES-256-GCM key encryption |

---

## License

MIT
