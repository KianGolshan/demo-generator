import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { callClaude } from "@/lib/claude";
import type { ApiError, CodeSummary } from "@/types";
import { Octokit } from "@octokit/rest";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILES_TO_FETCH = 20;
const MAX_FILE_CHARS = 3000;

/** File paths/names that signal routing or page structure */
const ROUTE_PATTERNS = [
  /^(src\/)?(app|pages|routes?)\//i,
  /router\.(js|ts|jsx|tsx)$/i,
  /routes?\.(js|ts|jsx|tsx)$/i,
  /index\.(js|ts|jsx|tsx)$/i,
];

/**
 * Filename patterns that hint at AI/LLM usage.
 * These match against file paths (not content) during the initial scoring pass.
 * Content-level import detection happens in scoreFileContent() after fetching.
 */
const AI_FILENAME_PATTERNS = [
  /\b(openai|anthropic|claude|gpt|llm|langchain|pinecone|cohere|replicate|huggingface)\b/i,
  /\bai[_-]?(lib|helper|client|service|utils?)\b/i,
  /\b(chat|embed|vector|rag)\b/i,
];

/** Import patterns that indicate AI/LLM usage — checked against file content after fetch */
const AI_IMPORT_PATTERNS = [
  /from ['"]openai['"]/,
  /from ['"]@anthropic-ai/,
  /from ['"]anthropic['"]/,
  /from ['"]langchain/,
  /from ['"]@langchain/,
  /from ['"]pinecone/,
  /from ['"]@pinecone-database/,
  /from ['"]cohere/,
  /from ['"]replicate['"]/,
  /from ['"]@huggingface/,
  /require\(['"]openai['"]\)/,
  /require\(['"]anthropic['"]\)/,
];

/** File extensions we care about */
const CODE_EXTENSIONS = /\.(js|ts|jsx|tsx|py|rb|go|rs|java|cs|php)$/i;

// ─── Schemas ──────────────────────────────────────────────────────────────────

const BodySchema = z.object({
  repoFullName: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, "Must be in owner/repo format"),
});

const CodeSummarySchema = z.object({
  stack: z.object({
    frontend:   z.string().optional(),
    backend:    z.string().optional(),
    aiProviders: z.array(z.string()).optional().default([]),
    databases:  z.array(z.string()).optional().default([]),
  }),
  routes: z.array(z.object({ path: z.string(), description: z.string() })),
  features: z.array(z.string()).max(7),
  aiUsage: z.array(z.string()),
});

// ─── System prompt (exact copy from spec) ────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert codebase summarizer. I will give you a list of files and selected contents from a web app repo.

Infer:
- Likely frontend and backend frameworks
- Any AI/LLM usage and providers
- Primary routes/pages and what they appear to do
- 3–7 top-level features described in user-friendly language

Output ONLY a JSON object matching this shape exactly:
{
  "stack": { "frontend": string, "backend": string, "aiProviders": string[], "databases": string[] },
  "routes": [{ "path": string, "description": string }],
  "features": string[],
  "aiUsage": string[]
}

Do not include any text outside the JSON.`;

// ─── Route Handler ────────────────────────────────────────────────────────────

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/demos/[id]/analyze-repo
 * Fetches the GitHub repo file tree, identifies interesting files, sends their
 * contents to Claude, parses the CodeSummary JSON, and saves it to DB.
 *
 * @body { repoFullName: string } e.g. "KianGolshan/Valuation-Dashboard"
 * @returns The saved CodeSummary object.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    // Auth — getUser() re-validates the JWT with Supabase's server (secure)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<ApiError>(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Get provider_token separately — only available in session, not getUser()
    const { data: { session } } = await supabase.auth.getSession();

    // Verify demo ownership
    const demo = await prisma.demoProject.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!demo) {
      return NextResponse.json<ApiError>(
        { error: "Demo not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Validate request body
    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiError>(
        { error: parsed.error.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { repoFullName } = parsed.data;
    const [owner, repo] = repoFullName.split("/");

    // Get GitHub OAuth token — provider_token is set when user signed in with GitHub OAuth
    const githubToken = session?.provider_token ?? undefined;

    const octokit = new Octokit({ auth: githubToken });

    // 1. Fetch the full file tree (recursive)
    let tree: { path?: string; type?: string; size?: number }[] = [];
    try {
      const { data } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: "HEAD",
        recursive: "1",
      });
      tree = data.tree;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json<ApiError>(
        {
          error: `Could not access repo "${repoFullName}". Make sure it exists and is accessible. ${msg}`,
          code: "REPO_ACCESS_FAILED",
        },
        { status: 422 }
      );
    }

    // 2. Filter to interesting files
    const candidates = tree.filter(
      (f) =>
        f.type === "blob" &&
        f.path &&
        CODE_EXTENSIONS.test(f.path) &&
        !f.path.includes("node_modules/") &&
        !f.path.includes(".next/") &&
        !f.path.includes("dist/") &&
        !f.path.includes("build/") &&
        !f.path.includes(".git/") &&
        (f.size ?? 0) < 100_000 // skip huge generated files
    );

    const interestingFiles = scoreAndRank(candidates).slice(0, MAX_FILES_TO_FETCH);

    // 3. Fetch file contents in parallel (max 20)
    const rawContents = await fetchFileContents(octokit, owner, repo, interestingFiles);

    // Re-sort by content-level AI import presence (boost AI files to top)
    const fileContents = rawContents.sort((a, b) => {
      const aHasAI = AI_IMPORT_PATTERNS.some((r) => r.test(a.content)) ? 1 : 0;
      const bHasAI = AI_IMPORT_PATTERNS.some((r) => r.test(b.content)) ? 1 : 0;
      return bHasAI - aHasAI;
    });

    // 4. Build the Claude prompt
    const userPrompt = buildPrompt(repoFullName, fileContents);

    // 5. Call Claude
    let rawJson: string;
    try {
      rawJson = await callClaude({
        system: SYSTEM_PROMPT,
        user:   userPrompt,
        maxTokens: 1500,
      });
    } catch (err) {
      console.error("[analyze-repo] Claude API error:", err);
      return NextResponse.json<ApiError>(
        { error: "AI analysis failed. Please try again.", code: "CLAUDE_ERROR" },
        { status: 502 }
      );
    }

    // 6. Parse and validate Claude's JSON output
    let codeSummary: CodeSummary;
    try {
      const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      const parsed = CodeSummarySchema.parse(JSON.parse(jsonMatch[0]));
      codeSummary = parsed as CodeSummary;
    } catch {
      console.error("[analyze-repo] JSON parse failed. Raw:", rawJson.slice(0, 500));
      return NextResponse.json<ApiError>(
        {
          error: "AI returned an invalid response. Please try again.",
          code: "PARSE_ERROR",
        },
        { status: 502 }
      );
    }

    // 7. Save to DB
    await prisma.demoProject.update({
      where: { id },
      data: {
        codeSummary: codeSummary as object,
        // If sourceType doesn't already include 'repo', upgrade it
      },
    });

    return NextResponse.json({ codeSummary }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/demos/[id]/analyze-repo]", err);
    return NextResponse.json<ApiError>(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Scores and ranks repo files by how "interesting" they are for AI analysis.
 * Higher score = more likely to reveal app structure and features.
 */
function scoreAndRank(
  files: { path?: string; size?: number }[]
): { path: string; size: number }[] {
  return files
    .filter((f): f is { path: string; size: number } => !!f.path)
    .map((f) => {
      let score = 0;
      const p = f.path.toLowerCase();

      // Route/page files are high value
      if (ROUTE_PATTERNS.some((r) => r.test(p))) score += 10;

      // Root-level files signal project setup
      if (!p.includes("/")) score += 5;

      // API routes
      if (p.includes("/api/")) score += 8;

      // Files whose name hints at AI usage (filename-based heuristic)
      if (AI_FILENAME_PATTERNS.some((r) => r.test(p))) score += 12;

      // Component files
      if (p.includes("/component")) score += 4;

      // Config files
      if (/package\.json|tsconfig|next\.config|vite\.config/.test(p)) score += 6;

      // Avoid test files and style files
      if (/\.(test|spec|stories)\.|\.css$|\.scss$|\.svg$/.test(p)) score -= 20;

      // Prefer smaller files (faster to read, less noise)
      if (f.size < 5000) score += 2;

      return { path: f.path, size: f.size ?? 0, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ path, size }) => ({ path, size }));
}

/**
 * Fetches file contents from GitHub in parallel.
 * Truncates each file at MAX_FILE_CHARS to stay within Claude's context budget.
 *
 * @returns Array of { path, content } objects for files successfully fetched.
 */
async function fetchFileContents(
  octokit: Octokit,
  owner: string,
  repo: string,
  files: { path: string }[]
): Promise<{ path: string; content: string }[]> {
  const results = await Promise.allSettled(
    files.map(async ({ path }) => {
      const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
      if (Array.isArray(data) || data.type !== "file") {
        throw new Error("Not a file");
      }
      const decoded = Buffer.from(data.content, "base64").toString("utf-8");
      return {
        path,
        content: decoded.slice(0, MAX_FILE_CHARS),
      };
    })
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<{ path: string; content: string }> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);
}

/**
 * Builds the user message for Claude's code summary prompt.
 *
 * @param repoFullName - e.g. "KianGolshan/Valuation-Dashboard"
 * @param files        - Array of fetched file path + content pairs.
 * @returns The formatted prompt string.
 */
function buildPrompt(
  repoFullName: string,
  files: { path: string; content: string }[]
): string {
  const fileBlock = files
    .map(
      ({ path, content }) =>
        `### ${path}\n\`\`\`\n${content}\n\`\`\``
    )
    .join("\n\n");

  return `Repo: ${repoFullName}
Total files analyzed: ${files.length}

${fileBlock}`;
}
