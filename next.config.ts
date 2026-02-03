import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Skip type checking during build (types need Supabase codegen)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
