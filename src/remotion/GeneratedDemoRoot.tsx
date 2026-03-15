import { Composition } from "remotion";
import {
  GeneratedDemo,
  GENERATED_DURATION,
  GENERATED_FPS,
  GENERATED_WIDTH,
  GENERATED_HEIGHT,
} from "./GeneratedDemo";

/**
 * Remotion root for the generated code pipeline.
 * Registers the GeneratedDemo composition — which is overwritten by
 * the generate-composition API before each bundle + render.
 */
export const GeneratedDemoRoot: React.FC = () => (
  <Composition
    id="GeneratedDemo"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component={GeneratedDemo as any}
    durationInFrames={GENERATED_DURATION}
    fps={GENERATED_FPS}
    width={GENERATED_WIDTH}
    height={GENERATED_HEIGHT}
    defaultProps={{ screenshotUrls: [] }}
  />
);
