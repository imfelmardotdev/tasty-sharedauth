import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  optimizeDeps: {
    include: [
      'zod',
      'react',
      'react-dom',
      'react-router-dom',
      '@hookform/resolvers/zod',
      'react-hook-form',
      '@supabase/supabase-js'
    ]
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    modulePreload: {
      polyfill: true
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('zod') || id.includes('@hookform/resolvers/zod')) {
              return 'zod-chunk';
            }
            if (id.includes('qr-scanner')) {
              return 'qr-scanner';
            }
            return 'vendor';
          }
        }
      }
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  server: {
    host: true, // This enables listening on all addresses
    cors: true, // Enable CORS
    strictPort: true, // Fail if port is already in use
    port: 5173,
    hmr: {
      host: 'localhost',
      port: 5173,
    },
    watch: {
      usePolling: true,
    },
  }
});
