import { NextRequest, NextResponse } from "next/server";
import type { ApiError } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/demos/[id]/generate-config
 * Composes the demo config generation prompt, calls Claude API,
 * parses and validates the DemoConfig JSON response, and saves to DB.
 * Updates renderStatus to "config_generated".
 *
 * TODO (Slice 4): Implement full config generation pipeline.
 */
export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  // TODO (Slice 4): implement
  return NextResponse.json<ApiError>(
    { error: `Config generation for demo ${id} not yet implemented`, code: "NOT_IMPLEMENTED" },
    { status: 501 }
  );
}
