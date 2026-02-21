import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 3001,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Prediction Wallets - Polymarket Tracker",
        short_name: "PredictWallets",
        description: "Free Polymarket wallet tracker. Monitor PnL, win rate, portfolio value, and trading volume. Compare multiple wallets in real-time.",
        theme_color: "#0f1215",
        background_color: "#0f1215",
        display: "standalone",
        start_url: "/",
        scope: "/",
        categories: ["finance", "productivity", "utilities"],
        lang: "en",
        dir: "ltr",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["react-grid-layout", "react-grid-layout/legacy"],
  },
}));
