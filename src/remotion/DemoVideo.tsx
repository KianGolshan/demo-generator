import { AbsoluteFill, Sequence } from "remotion";
import type { DemoConfig } from "@/types";
import { FPS, VIDEO_DIMENSIONS, getTheme } from "./theme";
import { IntroScene } from "./scenes/IntroScene";
import { FeatureScene } from "./scenes/FeatureScene";
import { OutroScene } from "./scenes/OutroScene";

export interface DemoVideoProps {
  /** Full DemoConfig as generated/edited by the user. */
  config: DemoConfig;
  /**
   * Array of screenshot public URLs.
   * Positionally matches scene.screenshotId (which is an index string "0", "1", ...).
   */
  screenshotUrls: string[];
}

/**
 * Root Remotion composition. Maps DemoConfig scenes to typed scene components
 * wrapped in <Sequence> blocks, each with the correct durationInFrames (at 30fps).
 *
 * @param config        - The DemoConfig to render.
 * @param screenshotUrls - Resolved public URLs for screenshots.
 */
export const DemoVideo: React.FC<DemoVideoProps> = ({ config, screenshotUrls }) => {
  const theme = getTheme(config.theme);

  // Calculate cumulative frame offsets for each scene
  let frameOffset = 0;

  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      {config.scenes.map((scene, i) => {
        const durationInFrames = Math.max(1, Math.round(scene.durationSeconds * FPS));
        const from = frameOffset;
        frameOffset += durationInFrames;

        // Resolve screenshotId → URL
        const screenshotUrl =
          scene.screenshotId != null
            ? screenshotUrls[parseInt(scene.screenshotId, 10)]
            : undefined;

        return (
          <Sequence key={i} from={from} durationInFrames={durationInFrames}>
            {scene.type === "intro" && (
              <IntroScene
                headline={scene.headline}
                tagline={config.tagline}
                body={scene.body}
                theme={theme}
              />
            )}
            {scene.type === "feature" && (
              <FeatureScene
                headline={scene.headline}
                body={scene.body}
                screenshotUrl={screenshotUrl}
                technicalNote={scene.technicalNote ?? undefined}
                theme={theme}
              />
            )}
            {scene.type === "outro" && (
              <OutroScene
                headline={scene.headline}
                cta={scene.cta ?? undefined}
                technicalNote={scene.technicalNote ?? undefined}
                body={scene.body}
                theme={theme}
              />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Calculates total durationInFrames for a DemoConfig (sum of all scene durations * FPS).
 *
 * @param config - The DemoConfig to measure.
 * @returns Total frame count at 30fps.
 */
export function getTotalFrames(config: DemoConfig): number {
  return config.scenes.reduce(
    (sum, scene) => sum + Math.max(1, Math.round(scene.durationSeconds * FPS)),
    0
  );
}

/**
 * Returns the video width/height for a given aspect ratio.
 *
 * @param aspectRatio - "16:9" or "9:16".
 */
export function getVideoDimensions(aspectRatio: DemoConfig["aspectRatio"]) {
  return VIDEO_DIMENSIONS[aspectRatio] ?? VIDEO_DIMENSIONS["16:9"];
}
