import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    },
    // In local dev mode, proxy /ws → Python signaling server on :8765
    // In production (Vercel), the VITE_SIGNALING_URL env var is used instead.
    proxy: mode === "development"
      ? {
          "/ws": {
            target: "ws://127.0.0.1:8765",
            ws: true,
            changeOrigin: true,
            rewriteWsOrigin: true,
          },
        }
      : undefined,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: mode === "development",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          recharts: ["recharts"],
          ui: ["@radix-ui/react-dialog"],
        },
      },
    },
  },
}));
