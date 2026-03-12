import { NextRequest, NextResponse } from "next/server";
import type { ApiError } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/demos/[id]/screenshots
 * Accepts multipart form data with up to 6 screenshot files.
 * Uploads each to Supabase Storage at screenshots/[userId]/[demoId]/[filename].
 * Updates the DemoProject.screenshotUrls array.
 *
 * TODO (Slice 2): Implement full upload logic.
 */
export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  // TODO (Slice 2): implement
  return NextResponse.json<ApiError>(
    { error: `Screenshot upload for demo ${id} not yet implemented`, code: "NOT_IMPLEMENTED" },
    { status: 501 }
  );
}
