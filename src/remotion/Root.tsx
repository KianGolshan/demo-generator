import { Composition } from "remotion";
import { DemoVideo, getTotalFrames, getVideoDimensions } from "./DemoVideo";
import type { DemoVideoProps } from "./DemoVideo";
import { FPS } from "./theme";

/**
 * Remotion root — registers the DemoVideo composition for the CLI bundler.
 * Used by @remotion/renderer's renderMedia() in the render API route (Slice 6).
 *
 * The defaultProps here are placeholders; actual props are passed at render time
 * via renderMedia()'s inputProps parameter.
 */
export const RemotionRoot: React.FC = () => {
  const defaultConfig: DemoVideoProps["config"] = {
    title:       "My Demo",
    tagline:     "Built with AI",
    theme:       "clean",
    aspectRatio: "16:9",
    scenes: [
      {
        type:            "intro",
        durationSeconds: 5,
        headline:        "My Demo",
        body:            ["Built fast. Ships faster."],
      },
      {
        type:            "feature",
        durationSeconds: 8,
        headline:        "Core Feature",
        body:            ["Does the thing you need"],
      },
      {
        type:            "outro",
        durationSeconds: 5,
        headline:        "Start building today",
        cta:             "Try it now",
        body:            [],
      },
    ],
  };

  const { width, height } = getVideoDimensions(defaultConfig.aspectRatio);
  const durationInFrames = getTotalFrames(defaultConfig);

  return (
    <Composition
      id="DemoVideo"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component={DemoVideo as any}
      durationInFrames={durationInFrames}
      fps={FPS}
      width={width}
      height={height}
      defaultProps={{
        config:         defaultConfig,
        screenshotUrls: [],
      }}
      calculateMetadata={async ({ props }) => {
        const p = props as unknown as DemoVideoProps;
        const { width: w, height: h } = getVideoDimensions(p.config.aspectRatio);
        return {
          width:            w,
          height:           h,
          durationInFrames: getTotalFrames(p.config),
          fps:              FPS,
        };
      }}
    />
  );
};
