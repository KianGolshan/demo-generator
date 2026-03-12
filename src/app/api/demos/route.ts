import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateDemoSchema = z.object({
  projectName: z.string().min(1).max(100),
  tagline:     z.string().max(200).default(""),
  description: z.string().max(2000).default(""),
  sourceType:  z.enum(["url", "screenshots", "repo+url", "repo+screenshots"]),
  sourceUrl:   z.string().url().optional(),
  stylePreset: z.enum(["clean", "cyber", "playful"]).default("clean"),
});

/**
 * POST /api/demos
 * Creates a new DemoProject in draft status.
 *
 * @body CreateDemoSchema
 * @returns The created DemoProject row.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<ApiError>(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = CreateDemoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiError>(
        { error: parsed.error.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const demo = await prisma.demoProject.create({
      data: {
        userId:      user.id,
        projectName: parsed.data.projectName,
        tagline:     parsed.data.tagline,
        description: parsed.data.description,
        sourceType:  parsed.data.sourceType,
        sourceUrl:   parsed.data.sourceUrl,
        stylePreset: parsed.data.stylePreset,
      },
    });

    return NextResponse.json(demo, { status: 201 });
  } catch (err) {
    console.error("[POST /api/demos]", err);
    return NextResponse.json<ApiError>(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
