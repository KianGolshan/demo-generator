import { prisma } from "@/lib/prisma";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";
import { NextRequest, NextResponse } from "next/server";

const BUCKET = "screenshots";
const MAX_FILES = 6;
const MAX_FILE_SIZE_MB = 5;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/demos/[id]/screenshots
 * Accepts multipart form data with up to 6 image files (field name: "files").
 * Uploads each to Supabase Storage at: screenshots/{userId}/{demoId}/{filename}
 * Appends the public URLs to DemoProject.screenshotUrls in DB.
 *
 * @returns { screenshotUrls: string[] } — the full updated array of URLs.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<ApiError>(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Verify demo ownership
    const demo = await prisma.demoProject.findFirst({
      where: { id, userId: user.id },
      select: { id: true, screenshotUrls: true },
    });

    if (!demo) {
      return NextResponse.json<ApiError>(
        { error: "Demo not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json<ApiError>(
        { error: "No files provided", code: "NO_FILES" },
        { status: 400 }
      );
    }

    const existingUrls = (demo.screenshotUrls as string[]) ?? [];
    const remainingSlots = MAX_FILES - existingUrls.length;

    if (remainingSlots <= 0) {
      return NextResponse.json<ApiError>(
        { error: `Maximum ${MAX_FILES} screenshots allowed`, code: "MAX_FILES_EXCEEDED" },
        { status: 400 }
      );
    }

    const filesToProcess = files.slice(0, remainingSlots);
    const adminClient = createAdminClient();
    const uploadedUrls: string[] = [];

    for (const file of filesToProcess) {
      if (!file.type.startsWith("image/")) {
        continue; // silently skip non-images
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        continue; // silently skip oversized files
      }

      const ext = file.name.split(".").pop() ?? "png";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const storagePath = `${user.id}/${id}/${filename}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await adminClient.storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("[screenshots] upload error:", uploadError.message);
        continue;
      }

      const { data: urlData } = adminClient.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

      uploadedUrls.push(urlData.publicUrl);
    }

    if (!uploadedUrls.length) {
      return NextResponse.json<ApiError>(
        { error: "No valid images could be uploaded", code: "UPLOAD_FAILED" },
        { status: 422 }
      );
    }

    // Append to DB
    const allUrls = [...existingUrls, ...uploadedUrls];
    await prisma.demoProject.update({
      where: { id },
      data: { screenshotUrls: allUrls },
    });

    return NextResponse.json({ screenshotUrls: allUrls }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/demos/[id]/screenshots]", err);
    return NextResponse.json<ApiError>(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
