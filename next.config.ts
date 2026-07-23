import type { NextConfig } from "next";
import path from "node:path";

import { env } from "./src/lib/env";

void env;

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(import.meta.dirname ?? __dirname),
  },
};

export default nextConfig;
