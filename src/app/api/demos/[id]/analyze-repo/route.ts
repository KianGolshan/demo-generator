import { NextRequest, NextResponse } from "next/server";
import type { ApiError } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/demos/[id]/analyze-repo
 * Accepts { repoFullName: string }.
 * Uses Octokit to fetch the repo file tree, identifies interesting files,
 * sends them to Claude, and saves the resulting CodeSummary to DB.
 *
 * TODO (Slice 3): Implement full repo analysis pipeline.
 */
export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  // TODO (Slice 3): implement
  return NextResponse.json<ApiError>(
    { error: `Repo analysis for demo ${id} not yet implemented`, code: "NOT_IMPLEMENTED" },
    { status: 501 }
  );
}
