# DemoForge

**Transform your vibe-coded project into a polished 30–90 second product demo video — powered by Claude AI and Remotion.**

DemoForge takes your screenshots, GitHub repo, and a few lines of description, then uses Claude to write a structured demo narrative and Remotion to render it into a shareable MP4. No video editing required.

---

## What It Does

1. **Ingest your project** — upload screenshots, paste a URL, or connect a GitHub repo for deep code analysis
2. **AI-generated outline** — Claude reads your inputs and writes a scene-by-scene demo story (intro → feature highlights → CTA outro)
3. **Edit the outline** — drag to reorder scenes, click any text to edit inline, adjust durations
4. **Render to MP4** — Remotion renders your demo video server-side at 1080p/720p/9:16 with animated transitions, Ken Burns effects, and themed visuals
5. **Download or share** — video is stored in Supabase Storage with a direct download link

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Video | Remotion v4 + `@remotion/renderer` |
| Auth | Supabase Auth (GitHub OAuth + magic link) |
| Database | Supabase Postgres + Prisma 7 (PrismaPg adapter) |
| Storage | Supabase Storage (screenshots + rendered videos) |
| Repo Analysis | Octokit REST API |
| Styling | Tailwind CSS + custom dark design system |
| Fonts | Syne (display) + IBM Plex Mono |

---

## Project Structure

```
src/
├── app/
│   ├── api/demos/[id]/
│   │   ├── route.ts              # GET / PATCH / DELETE demo
│   │   ├── screenshots/          # Multipart screenshot upload → Supabase Storage
│   │   ├── analyze-repo/         # GitHub tree traversal + Claude code analysis
│   │   ├── generate-config/      # Claude demo outline generation
│   │   └── render/               # Remotion render orchestration + status polling
│   ├── demos/
│   │   ├── page.tsx              # Dashboard
│   │   ├── [id]/page.tsx         # Demo detail (outline editor + player + render)
│   │   └── new/                  # 3-step wizard (info → assets → style)
│   └── login/                    # Auth (GitHub OAuth + magic link)
├── components/
│   ├── OutlinePanel.tsx          # Scene editor with drag-and-drop + inline edit
│   ├── RepoPanel.tsx             # GitHub repo analysis UI
│   ├── RenderPanel.tsx           # Render trigger + status polling + video player
│   ├── DemoPlayer.tsx            # @remotion/player in-browser preview
│   └── Toast.tsx                 # Toast notification system
├── remotion/
│   ├── DemoVideo.tsx             # Root composition — maps scenes to Sequences
│   ├── scenes/
│   │   ├── IntroScene.tsx        # Animated title + tagline + bullets
│   │   ├── FeatureScene.tsx      # Screenshot Ken Burns + slide-in copy panel
│   │   └── OutroScene.tsx        # CTA + tech stack chips
│   └── theme.ts                  # Theme tokens (clean / cyber / playful)
├── lib/
│   ├── claude.ts                 # callClaude() helper with token logging
│   ├── prisma.ts                 # Prisma singleton (PrismaPg adapter)
│   └── supabase/                 # Server + admin Supabase clients
└── types/index.ts                # Shared TypeScript interfaces
```

---

## Local Development

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Anthropic](https://console.anthropic.com) API key
- A [GitHub OAuth App](https://github.com/settings/developers) (for repo analysis)

### 1. Clone and install

```bash
git clone https://github.com/KianGolshan/demo-generator.git
cd demo-generator
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Fill in `.env` with your credentials (see `.env.example` for all required keys).

### 3. Database setup

```bash
npx prisma migrate dev --name init
```

### 4. Supabase Storage

Create two public storage buckets in your Supabase dashboard:
- `screenshots`
- `videos`

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How the Render Pipeline Works

Rendering is the most complex part of DemoForge. Because Remotion's renderer uses native Node.js binaries that can't run in serverless environments, the architecture works like this:

```
POST /api/demos/[id]/render
  └─ Sets renderStatus = "rendering", returns 202 immediately
  └─ void runRender()  ← detached background task
       ├─ bundle() — Remotion bundles the composition with rspack
       ├─ selectComposition() — reads inputProps (scenes, screenshots, theme)
       ├─ renderMedia() — renders MP4 to /tmp/
       ├─ upload to Supabase Storage
       └─ updates DB: renderStatus = "ready" | "failed"

Client polls GET /api/demos/[id]/render/status every 2s
  └─ Shows progress bar → video player on "ready"
```

> **Note:** This background task approach works on long-running servers (VPS, Railway, Render). It will time out on Vercel's serverless functions. For Vercel deployments, the render step needs to be offloaded to a separate worker.

---

## Claude Integration

DemoForge makes two distinct Claude calls:

**1. Repo Analysis** (`analyze-repo`)
- Fetches and scores the top ~15 most relevant files from a GitHub repo
- Asks Claude to extract: tech stack, key features, AI usage patterns, and notable routes
- Output validated with Zod and stored as `codeSummary` JSON

**2. Demo Outline Generation** (`generate-config`)
- Combines all project inputs (name, tagline, description, screenshots, code summary, style preset)
- Asks Claude to write a structured `DemoConfig` with typed scenes (intro / feature / outro)
- Each scene has: headline, body bullets, duration, and optional CTA/tech note

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `DATABASE_URL` | Postgres connection string (pooler, port 6543) |
| `DIRECT_URL` | Postgres direct connection (port 5432, for migrations) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `NEXT_PUBLIC_APP_URL` | App base URL (for OAuth callback) |

---

## License

MIT
