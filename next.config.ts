import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PAIOS runs as a single-user app; keep server actions and route handlers lean.
  experimental: {
    // Allow larger request bodies for voice-note transcripts forwarded by QStash.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
