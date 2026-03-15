import { Composition } from "remotion";
import { DemoVideo, getTotalFrames, getVideoDimensions } from "./DemoVideo";
import type { DemoVideoProps } from "./DemoVideo";
import { FPS } from "./theme";

/**
 * Remotion root — registers the DemoVideo composition for the CLI bundler.
 * Used by @remotion/renderer's renderMedia() in the render API route.
 *
 * defaultProps use the new durationFrames-based scene format.
 * Actual props are passed at render time via renderMedia()'s inputProps.
 */
export const RemotionRoot: React.FC = () => {
  const defaultConfig: DemoVideoProps["config"] = {
    title:       "My Demo",
    tagline:     "Built with AI",
    theme:       "clean",
    aspectRatio: "16:9",
    scenes: [
      {
        type:           "hook",
        durationFrames: 75,
        lines:          ["The old way is broken.", "Meet My Demo."],
        accentLine:     1,
      },
      {
        type:           "browser-flow",
        durationFrames: 180,
        url:            "app.myapp.com",
        headline:       "See it in action",
        steps: [
          { frame: 0,   type: "load",   label: "App loads" },
          { frame: 30,  type: "type",   fieldName: "Query", fieldValue: "example input", label: "User types..." },
          { frame: 75,  type: "click",  buttonLabel: "Submit", label: "Processing..." },
          { frame: 100, type: "result", resultText: "Result 1\nResult 2\nResult 3", label: "Done in 0.8s" },
        ],
        overlayText: "Results in under a second",
      },
      {
        type:           "end-card",
        durationFrames: 90,
        title:          "My Demo",
        tagline:        "Ship faster. Build better.",
        subtext:        "Built with Next.js + Claude",
      },
    ],
  };

  const { width, height } = getVideoDimensions(defaultConfig.aspectRatio);
  const durationInFrames  = getTotalFrames(defaultConfig);

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
