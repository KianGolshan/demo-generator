import { registerRoot } from "remotion";
import { GeneratedDemoRoot } from "./GeneratedDemoRoot";

/**
 * Remotion CLI entry point for the generated code pipeline.
 * Used by @remotion/bundler's bundle() when rendering generated demos.
 */
registerRoot(GeneratedDemoRoot);
