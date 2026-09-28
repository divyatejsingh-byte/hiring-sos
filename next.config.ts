import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the native-ish parsers out of the server bundle; they're loaded from node_modules at runtime.
  serverExternalPackages: ["unpdf", "mammoth"],
  // Ensure rubric.txt ships with the serverless function on platforms like Vercel.
  outputFileTracingIncludes: {
    "/api/screen": ["./rubric.txt"],
  },
};

export default nextConfig;
