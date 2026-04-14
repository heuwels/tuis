import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
};

// Only apply Sentry webpack plugin if DSN is set (opt-in)
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      // Suppress source map upload (not needed for GlitchTip)
      sourcemaps: { disable: true },
      // Disable telemetry
      telemetry: false,
      // Silence build logs
      silent: true,
    })
  : nextConfig;
