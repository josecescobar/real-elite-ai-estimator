import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "better-sqlite3"],
};

export default nextConfig;
