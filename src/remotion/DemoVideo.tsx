import { AbsoluteFill, Sequence } from "remotion";
import type { DemoConfig } from "@/types";
import { VIDEO_DIMENSIONS, getTheme } from "./theme";

// New scene components
import { HookScene }        from "./scenes/HookScene";
import { CodeScene }        from "./scenes/CodeScene";
import { BrowserFlowScene } from "./scenes/BrowserFlowScene";
import { TerminalScene }    from "./scenes/TerminalScene";
import { ComparisonScene }  from "./scenes/ComparisonScene";
import { EndCardScene }     from "./scenes/EndCardScene";

export interface DemoVideoProps {
  /** Full DemoConfig as generated/edited by the user. */
  config: DemoConfig;
  /**
   * Array of screenshot public URLs.
   * Kept for backward compatibility — new scene types don't use these directly.
   */
  screenshotUrls: string[];
}

/**
 * Root Remotion composition. Maps DemoConfig scenes to typed scene components
 * wrapped in <Sequence> blocks. Scenes now use durationFrames (not durationSeconds).
 *
 * Supported scene types: hook | code | browser-flow | terminal | comparison | end-card
 */
export const DemoVideo: React.FC<DemoVideoProps> = ({ config, screenshotUrls }) => {
  const theme = getTheme(config.theme);

  let frameOffset = 0;

  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      {config.scenes.map((scene, i) => {
        const durationInFrames = Math.max(1, scene.durationFrames);
        const from = frameOffset;
        frameOffset += durationInFrames;

        return (
          <Sequence key={i} from={from} durationInFrames={durationInFrames}>

            {scene.type === "hook" && (
              <HookScene
                lines={scene.lines ?? [scene.headline ?? scene.title ?? ""]}
                accentLine={scene.accentLine}
                theme={theme}
              />
            )}

            {scene.type === "code" && (
              <CodeScene
                filename={scene.filename ?? "index.ts"}
                codeLines={scene.codeLines ?? []}
                highlightLines={scene.highlightLines}
                errorLines={scene.errorLines}
                animateTyping={scene.animateTyping}
                overlayText={scene.overlayText}
                overlaySub={scene.overlaySub}
                headline={scene.headline}
                theme={theme}
              />
            )}

            {scene.type === "browser-flow" && (
              <BrowserFlowScene
                url={scene.url ?? "example.com"}
                steps={scene.steps ?? []}
                headline={scene.headline}
                overlayText={scene.overlayText}
                screenshotUrl={
                  scene.screenshotId != null
                    ? screenshotUrls[parseInt(scene.screenshotId, 10)]
                    : undefined
                }
                theme={theme}
              />
            )}

            {scene.type === "terminal" && (
              <TerminalScene
                terminalLines={scene.terminalLines ?? []}
                overlayText={scene.overlayText}
                overlaySub={scene.overlaySub}
                theme={theme}
              />
            )}

            {scene.type === "comparison" && (
              <ComparisonScene
                headline={scene.headline ?? "Before vs. After"}
                leftTitle={scene.leftTitle ?? "The old way"}
                leftItems={scene.leftItems ?? []}
                rightTitle={scene.rightTitle ?? "With this app"}
                rightItems={scene.rightItems ?? []}
                theme={theme}
              />
            )}

            {scene.type === "end-card" && (
              <EndCardScene
                title={scene.title ?? config.title}
                tagline={scene.tagline ?? config.tagline}
                subtext={scene.subtext}
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
 * Calculates total durationInFrames for a DemoConfig.
 * Uses durationFrames directly (no fps conversion needed).
 */
export function getTotalFrames(config: DemoConfig): number {
  return config.scenes.reduce(
    (sum, scene) => sum + Math.max(1, scene.durationFrames),
    0
  );
}

/**
 * Returns the video width/height for a given aspect ratio.
 */
export function getVideoDimensions(aspectRatio: DemoConfig["aspectRatio"]) {
  return VIDEO_DIMENSIONS[aspectRatio] ?? VIDEO_DIMENSIONS["16:9"];
}
