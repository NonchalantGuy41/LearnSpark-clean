import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    TanStackRouterVite({ autoCodeSplitting: true }),
    tanstackStart({
      server: {
        entry: "src/server.ts",
        preset: "vercel",
      },
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
