import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { ApiError } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/demos/[id]/render/status
 * Returns the current renderStatus and videoUrl for the authenticated owner.
 * Auth-checked to prevent leaking private video URLs to third parties.
 *
 * @returns { renderStatus: string; videoUrl?: string }
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<ApiError>(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const demo = await prisma.demoProject.findFirst({
      where: { id, userId: user.id },
      select: { renderStatus: true, videoUrl: true },
    });

    if (!demo) {
      return NextResponse.json<ApiError>(
        { error: "Demo not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      renderStatus: demo.renderStatus,
      videoUrl:     demo.videoUrl,
    });
  } catch (err) {
    console.error("[GET /api/demos/[id]/render/status]", err);
    return NextResponse.json<ApiError>(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
