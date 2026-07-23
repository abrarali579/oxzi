import type { NextConfig } from "next";
import path from "node:path";

import { env } from "./src/lib/env";

void env;

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(import.meta.dirname ?? __dirname),
  },
  serverExternalPackages: ["oxc-parser", "@oxc-parser/binding-wasm32-wasi"],
};

export default nextConfig;
