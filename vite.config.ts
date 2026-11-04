import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Keep the existing GitHub Pages project URL working until the custom
// domain is connected. Set CUSTOM_DOMAIN=true in the Pages build workflow
// when bangnetmanager.bangnet.online is ready.
const base = process.env.CUSTOM_DOMAIN === "true" ? "/" : "/wa-produk-manager/";

export default defineConfig({
  plugins: [react()],
  base,
  build: { outDir: "dist", sourcemap: false }
});
