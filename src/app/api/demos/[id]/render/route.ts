import { prisma } from "@/lib/prisma";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { ApiError, DemoConfig } from "@/types";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import os from "os";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/demos/[id]/render
 * Triggers a server-side Remotion render of the DemoVideo composition.
 *
 * Flow:
 * 1. Auth + ownership check
 * 2. Validate demoConfig exists
 * 3. Set renderStatus = "rendering", return 202 immediately
 * 4. Background: bundle → renderMedia → upload MP4 → update DB to "ready"
 * 5. On any error: update renderStatus = "failed"
 *
 * ⚠️ SCALING NOTE: Bundling + rendering runs in the same Node process.
 * Acceptable for local dev / small scale. For production, extract to a
 * dedicated worker (Remotion Lambda or a separate Node service).
 *
 * @returns { renderStatus: "rendering" } immediately, then polls /render/status
 */
export async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    // Auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiError>(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Fetch + validate
    const raw = await prisma.demoProject.findFirst({
      where: { id, userId: user.id },
    });

    if (!raw) {
      return NextResponse.json<ApiError>(
        { error: "Demo not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const hasGeneratedCode = !!raw.generatedCode;
    const hasDemoConfig    = !!raw.demoConfig;

    if (!hasGeneratedCode && !hasDemoConfig) {
      return NextResponse.json<ApiError>(
        { error: "Generate a demo first before rendering.", code: "NO_CONFIG" },
        { status: 400 }
      );
    }

    const screenshotUrls = (raw.screenshotUrls as unknown as string[]) ?? [];

    // Mark as rendering immediately so the client can start polling
    await prisma.demoProject.update({
      where: { id },
      data:  { renderStatus: "rendering", videoUrl: null },
    });

    if (hasGeneratedCode) {
      // Generated code pipeline: write TSX to disk, bundle generated-entry, render GeneratedDemo
      void runGeneratedRender({
        demoId:        id,
        userId:        user.id,
        generatedCode: raw.generatedCode as string,
        screenshotUrls,
      });
    } else {
      // JSON config pipeline: use existing DemoVideo composition
      const demoConfig = raw.demoConfig as unknown as DemoConfig;
      void runRender({ demoId: id, userId: user.id, demoConfig, screenshotUrls });
    }

    return NextResponse.json({ renderStatus: "rendering" }, { status: 202 });
  } catch (err) {
    console.error("[POST /api/demos/[id]/render]", err);
    return NextResponse.json<ApiError>(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// ─── Background render task (generated code path) ────────────────────────────

/**
 * Generated-code render pipeline:
 * write GeneratedDemo.tsx → bundle generated-entry → renderMedia → upload → update DB.
 */
async function runGeneratedRender({
  demoId,
  userId,
  generatedCode,
  screenshotUrls,
}: {
  demoId:         string;
  userId:         string;
  generatedCode:  string;
  screenshotUrls: string[];
}) {
  const tmpDir     = os.tmpdir();
  const outputPath = path.join(tmpDir, `demoforge-gen-${demoId}.mp4`);
  const genDemoPath = path.resolve(process.cwd(), "src/remotion/GeneratedDemo.tsx");

  try {
    console.log(`[render:generated] Starting generated render for demo ${demoId}`);
    const start = Date.now();

    // 1. Write generated code to src/remotion/GeneratedDemo.tsx
    await fs.writeFile(genDemoPath, generatedCode, "utf-8");
    console.log("[render:generated] Wrote GeneratedDemo.tsx");

    // 2. Dynamically import Remotion modules
    const [{ bundle }, { selectComposition, renderMedia }] = await Promise.all([
      import("@remotion/bundler"),
      import("@remotion/renderer"),
    ]);

    const entryPoint = path.resolve(process.cwd(), "src/remotion/generated-entry.ts");

    // 3. Bundle the generated composition
    console.log("[render:generated] Bundling generated composition...");
    const bundleLocation = await bundle({
      entryPoint,
      webpackOverride: (config) => ({
        ...config,
        resolve: {
          ...config.resolve,
          alias: {
            ...(config.resolve?.alias ?? {}),
            "@": path.resolve(process.cwd(), "src"),
          },
        },
      }),
    });

    // 4. Select composition — screenshotUrls are passed as props
    const inputProps = { screenshotUrls };

    const composition = await selectComposition({
      serveUrl:  bundleLocation,
      id:        "GeneratedDemo",
      inputProps,
    });

    console.log(
      `[render:generated] Composition: ${composition.width}x${composition.height} ` +
      `${composition.durationInFrames} frames @ ${composition.fps}fps`
    );

    // 5. Render to MP4
    await renderMedia({
      composition,
      serveUrl:       bundleLocation,
      codec:          "h264",
      outputLocation: outputPath,
      inputProps,
      onProgress: ({ progress }) => {
        const pct = Math.round(progress * 100);
        if (pct % 25 === 0) console.log(`[render:generated] Progress: ${pct}%`);
      },
    });

    const renderMs = Date.now() - start;
    console.log(`[render:generated] Rendered in ${(renderMs / 1000).toFixed(1)}s`);

    // 6. Upload MP4 to Supabase Storage
    const fileBuffer  = await fs.readFile(outputPath);
    const storagePath = `${userId}/${demoId}/demo.mp4`;
    const adminClient = createAdminClient();

    const { error: uploadError } = await adminClient.storage
      .from("videos")
      .upload(storagePath, fileBuffer, { contentType: "video/mp4", upsert: true });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    const { data: urlData } = adminClient.storage.from("videos").getPublicUrl(storagePath);

    // 7. Update DB to ready
    await prisma.demoProject.update({
      where: { id: demoId },
      data:  { renderStatus: "ready", videoUrl: urlData.publicUrl },
    });

    console.log(`[render:generated] Done. videoUrl: ${urlData.publicUrl}`);
  } catch (err) {
    console.error("[render:generated] Render failed:", err);
    await prisma.demoProject.update({
      where: { id: demoId },
      data:  { renderStatus: "failed" },
    });
  } finally {
    await fs.unlink(outputPath).catch(() => {});
  }
}

// ─── Background render task (JSON config path) ────────────────────────────────

/**
 * Performs the full render pipeline in the background:
 * bundle → selectComposition → renderMedia → upload → update DB.
 *
 * Updates renderStatus to "ready" (with videoUrl) or "failed" in DB.
 */
async function runRender({
  demoId,
  userId,
  demoConfig,
  screenshotUrls,
}: {
  demoId:        string;
  userId:        string;
  demoConfig:    DemoConfig;
  screenshotUrls: string[];
}) {
  const tmpDir     = os.tmpdir();
  const outputPath = path.join(tmpDir, `demoforge-${demoId}.mp4`);

  try {
    console.log(`[render] Starting render for demo ${demoId}`);
    const start = Date.now();

    // 1. Dynamically import Remotion modules (server-only)
    const [{ bundle }, { selectComposition, renderMedia }] = await Promise.all([
      import("@remotion/bundler"),
      import("@remotion/renderer"),
    ]);

    const entryPoint = path.resolve(process.cwd(), "src/remotion/index.ts");

    // 2. Bundle the composition (webpack build of the Remotion root)
    console.log("[render] Bundling composition...");
    const bundleLocation = await bundle({
      entryPoint,
      webpackOverride: (config) => ({
        ...config,
        resolve: {
          ...config.resolve,
          alias: {
            ...(config.resolve?.alias ?? {}),
            "@": path.resolve(process.cwd(), "src"),
          },
        },
      }),
    });

    // 3. Select composition with actual inputProps (determines dimensions + duration)
    const inputProps = { config: demoConfig, screenshotUrls };

    const composition = await selectComposition({
      serveUrl:  bundleLocation,
      id:        "DemoVideo",
      inputProps,
    });

    console.log(
      `[render] Composition: ${composition.width}x${composition.height} ` +
      `${composition.durationInFrames} frames @ ${composition.fps}fps`
    );

    // 4. Render to MP4
    await renderMedia({
      composition,
      serveUrl:       bundleLocation,
      codec:          "h264",
      outputLocation: outputPath,
      inputProps,
      onProgress: ({ progress }) => {
        // Log progress at 25% intervals to avoid noise
        const pct = Math.round(progress * 100);
        if (pct % 25 === 0) {
          console.log(`[render] Progress: ${pct}%`);
        }
      },
    });

    const renderMs = Date.now() - start;
    console.log(`[render] Rendered in ${(renderMs / 1000).toFixed(1)}s`);

    // 5. Upload MP4 to Supabase Storage
    const fileBuffer = await fs.readFile(outputPath);
    const storagePath = `${userId}/${demoId}/demo.mp4`;
    const adminClient = createAdminClient();

    const { error: uploadError } = await adminClient.storage
      .from("videos")
      .upload(storagePath, fileBuffer, {
        contentType: "video/mp4",
        upsert:      true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = adminClient.storage
      .from("videos")
      .getPublicUrl(storagePath);

    // 6. Update DB to ready
    await prisma.demoProject.update({
      where: { id: demoId },
      data:  {
        renderStatus: "ready",
        videoUrl:     urlData.publicUrl,
      },
    });

    console.log(`[render] Done. videoUrl: ${urlData.publicUrl}`);
  } catch (err) {
    console.error("[render] Render failed:", err);
    await prisma.demoProject.update({
      where: { id: demoId },
      data:  { renderStatus: "failed" },
    });
  } finally {
    // Clean up temp file
    await fs.unlink(outputPath).catch(() => {});
  }
}
