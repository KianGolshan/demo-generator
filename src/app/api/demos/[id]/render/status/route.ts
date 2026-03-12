import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import type { ApiError } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/demos/[id]/render/status
 * Returns the current renderStatus and videoUrl for a demo.
 * Not auth-protected so clients can poll freely during render.
 *
 * @returns { renderStatus: string; videoUrl?: string }
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const demo = await prisma.demoProject.findUnique({
      where: { id },
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
