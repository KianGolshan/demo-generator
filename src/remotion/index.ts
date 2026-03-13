import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

/**
 * Remotion CLI entry point.
 * Used by @remotion/bundler's bundle() to create the webpack bundle
 * for server-side rendering via renderMedia() in the render API route.
 */
registerRoot(RemotionRoot);
