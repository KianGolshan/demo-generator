/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remotion's renderer uses Node built-ins not available in the edge runtime.
  // Next.js 14 uses the experimental key; Next.js 15+ uses serverExternalPackages.
  experimental: {
    serverComponentsExternalPackages: ["@remotion/renderer", "remotion"],
  },

  images: {
    // Allow Supabase Storage domains for screenshot/video thumbnails
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },

  // Needed for Remotion's canvas/webgl dependencies during server render
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(config.externals ?? []),
        "@remotion/renderer",
      ];
    }
    return config;
  },
};

export default nextConfig;
