import { NextRequest, NextResponse } from "next/server";
import type { ApiError } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/demos/[id]/render
 * Resolves screenshotIds to signed Supabase Storage URLs,
 * triggers Remotion renderMedia(), uploads the output MP4,
 * and updates renderStatus + videoUrl in DB.
 *
 * TODO (Slice 6): Implement full render orchestration.
 */
export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  // TODO (Slice 6): implement
  return NextResponse.json<ApiError>(
    { error: `Render for demo ${id} not yet implemented`, code: "NOT_IMPLEMENTED" },
    { status: 501 }
  );
}
