import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  optimizeDeps: {
    entries: ["src/main.tsx"],
  },
  plugins: [
    react(),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // This enables listening on all addresses
    cors: true, // Enable CORS
    strictPort: true, // Fail if port is already in use
    port: 5173,
    hmr: {
      host: 'localhost'
    },
  }
});
