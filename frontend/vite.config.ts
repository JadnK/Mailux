import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    // Comma-separated list of hostnames Vite's preview server should accept,
    // e.g. VITE_ALLOWED_HOSTS=mail.example.com. Defaults to "true" (any host)
    // for local previewing; production serving goes through the systemd
    // "serve" unit instead (see docs/DEPLOYMENT.md).
    allowedHosts: process.env.VITE_ALLOWED_HOSTS
      ? process.env.VITE_ALLOWED_HOSTS.split(",").map((h) => h.trim())
      : true,
  },
});
