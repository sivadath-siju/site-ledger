import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Keep the existing REACT_APP_API_URL variable working (set in .env / hosting dashboard).
  envPrefix: ["VITE_", "REACT_APP_"],
  server: { port: 3000 },
  build: {
    outDir: "build",          // same output folder as Create React App, so hosting settings don't change
    sourcemap: false,         // don't publish readable source maps
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) return "charts";
          if (id.includes("node_modules/xlsx")) return "xlsx";
          if (id.includes("node_modules/react")) return "react";
        },
      },
    },
  },
});
