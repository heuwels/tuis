import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withSentryConfig(nextConfig, {
  // Disable source map upload — not needed for GlitchTip
  sourcemaps: {
    disable: true,
  },
  // Disable telemetry
  telemetry: false,
});
