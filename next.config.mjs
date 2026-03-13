/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mark all Remotion packages as server-external so Next.js webpack doesn't
  // try to bundle them (they include native binaries + Node-only APIs).
  experimental: {
    serverComponentsExternalPackages: [
      "@remotion/renderer",
      "@remotion/bundler",
      "@remotion/cli",
      "remotion",
    ],
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent webpack from trying to bundle Remotion's native binaries.
      // They are loaded at runtime via require() in the render API route.
      const remotionExternals = [
        "@remotion/renderer",
        "@remotion/bundler",
        "@remotion/cli",
        "remotion",
      ];
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals ?? {}]),
        ...remotionExternals,
      ];
    }
    return config;
  },
};

export default nextConfig;
