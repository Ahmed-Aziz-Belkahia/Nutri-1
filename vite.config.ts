import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export default defineConfig({
  plugins: [react(), runtimeErrorOverlay(), themePlugin()],
  resolve: {
    alias: {
      "@db": path.resolve(__dirname, "db"),
      "@": path.resolve(__dirname, "client", "src"),
    },
  },
  root: path.resolve(__dirname, "client"),
  server: {
    // Listen on all interfaces and allow your public host
    host: true,
    allowedHosts: ["app.nutriai.online"],
    // Uncomment and adjust if you proxy TLS and need HMR over wss
    // hmr: {
    //   host: "app.nutriai.online",
    //   protocol: "wss",
    //   port: 443,
    // },
  },
  preview: {
    host: true,
    allowedHosts: ["app.nutriai.online"],
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
