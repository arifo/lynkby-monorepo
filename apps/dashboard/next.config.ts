import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize images
  images: {
    unoptimized: true, // Required for Cloudflare Workers
  },
  // Ensure static assets are properly handled
  trailingSlash: false,
  // Environment variables configuration
  env: {
    // Set production defaults for build time
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.lynkby.com',
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Lynkby',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://app.lynkby.com',
  },
  // Ensure CSS modules work properly
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure CSS is properly extracted
      config.optimization.splitChunks.cacheGroups.styles = {
        name: 'styles',
        test: /\.(css|scss)$/,
        chunks: 'all',
        enforce: true,
      };
    }
    return config;
  },
};

export default nextConfig;
// added by create cloudflare to enable calling `getCloudflareContext()` in `next dev`
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();

