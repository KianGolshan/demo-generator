"use client";

import { Player } from "@remotion/player";
import { DemoVideo, getTotalFrames, getVideoDimensions } from "@/remotion/DemoVideo";
import type { DemoConfig } from "@/types";
import { FPS } from "@/remotion/theme";

interface DemoPlayerProps {
  config:         DemoConfig;
  screenshotUrls: string[];
}

/**
 * In-browser Remotion player for previewing the demo video.
 * Renders the full DemoVideo composition at a scaled-down size.
 * Uses @remotion/player's <Player> which handles frame-by-frame playback.
 *
 * @param config         - The DemoConfig to preview.
 * @param screenshotUrls - Resolved public URLs for screenshots.
 */
export function DemoPlayer({ config, screenshotUrls }: DemoPlayerProps) {
  const { width, height } = getVideoDimensions(config.aspectRatio);
  const durationInFrames   = getTotalFrames(config);

  return (
    <div className="w-full">
      <Player
        component={DemoVideo}
        inputProps={{ config, screenshotUrls }}
        durationInFrames={durationInFrames}
        compositionWidth={width}
        compositionHeight={height}
        fps={FPS}
        style={{
          width:        "100%",
          aspectRatio:  config.aspectRatio === "16:9" ? "16/9" : "9/16",
          borderRadius: "12px",
          overflow:     "hidden",
        }}
        controls
        autoPlay={false}
        loop={false}
        showVolumeControls={false}
        clickToPlay
        doubleClickToFullscreen
      />
      <p className="text-muted-fg text-xs font-mono text-center mt-2">
        {durationInFrames / FPS}s · {config.scenes.length} scenes · {config.theme} · {config.aspectRatio}
      </p>
    </div>
  );
}
