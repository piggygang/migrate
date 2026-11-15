import type { NextConfig } from "next";
import { OPTIMIZED_PREFIXES } from "./lib/art";

const nextConfig: NextConfig = {
  images: {
    // Built from the list the picker checks a src against (lib/art.ts), so a
    // host can never be optimizable on one side and a 400 on the other. A
    // pattern built from a URL refuses query strings too.
    remotePatterns: OPTIMIZED_PREFIXES.map((prefix) => new URL(`${prefix}**`)),
  },
};

export default nextConfig;
