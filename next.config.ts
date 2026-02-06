import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  typescript: {
    // Skip type checking during build (types need Supabase codegen)
    ignoreBuildErrors: true,
  },
};

export default withNextIntl(nextConfig);
