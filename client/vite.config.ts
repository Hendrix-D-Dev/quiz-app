import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ✅ Vite dev server + backend proxy
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:4000", // ✅ backend server
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, "/api"), // explicit rewrite
      },
    },
  },
});
