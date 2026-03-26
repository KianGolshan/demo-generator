import { prisma } from "@/lib/prisma";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PatchDemoSchema = z.object({
  projectName: z.string().min(1).max(100).optional(),
  tagline:     z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  sourceType:  z.enum(["url", "screenshots", "repo", "repo+url", "repo+screenshots"]).optional(),
  sourceUrl:   z.string().url().optional().nullable(),
  stylePreset: z.enum(["clean", "cyber", "playful"]).optional(),
  features:    z.array(z.object({ title: z.string(), description: z.string() })).optional(),
  demoConfig:  z.record(z.string(), z.unknown()).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/demos/[id]
 * Fetches a single DemoProject. Only accessible by the owning user.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<ApiError>(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const demo = await prisma.demoProject.findFirst({
      where: { id, userId: user.id },
    });

    if (!demo) {
      return NextResponse.json<ApiError>(
        { error: "Demo not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(demo);
  } catch (err) {
    console.error("[GET /api/demos/[id]]", err);
    return NextResponse.json<ApiError>(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/demos/[id]
 * Updates mutable fields on a DemoProject. Only the owning user can update.
 *
 * @body PatchDemoSchema (all fields optional)
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<ApiError>(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Verify ownership
    const existing = await prisma.demoProject.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json<ApiError>(
        { error: "Demo not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = PatchDemoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiError>(
        { error: parsed.error.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Destructure to handle the demoConfig Json type separately
    const { demoConfig, ...rest } = parsed.data;

    const updated = await prisma.demoProject.update({
      where: { id },
      data: {
        ...rest,
        ...(demoConfig !== undefined && {
          demoConfig: demoConfig as Prisma.InputJsonValue,
        }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/demos/[id]]", err);
    return NextResponse.json<ApiError>(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<ApiError>(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const existing = await prisma.demoProject.findFirst({
      where: { id, userId: user.id },
      select: { id: true, userId: true },
    });

    if (!existing) {
      return NextResponse.json<ApiError>(
        { error: "Demo not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Delete DB row first
    await prisma.demoProject.delete({ where: { id } });

    // Best-effort storage cleanup (don't fail the request if this errors)
    try {
      const adminClient = createAdminClient();
      const prefix = `${existing.userId}/${id}`;

      const { data: screenshotFiles } = await adminClient.storage
        .from("screenshots")
        .list(`${prefix}`);
      if (screenshotFiles?.length) {
        await adminClient.storage
          .from("screenshots")
          .remove(screenshotFiles.map((f) => `${prefix}/${f.name}`));
      }

      await adminClient.storage.from("videos").remove([`${prefix}/demo.mp4`]);
    } catch (storageErr) {
      console.warn("[DELETE demo] Storage cleanup failed (non-fatal):", storageErr);
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/demos/[id]]", err);
    return NextResponse.json<ApiError>(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
