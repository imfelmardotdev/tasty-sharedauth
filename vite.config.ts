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
    rollupOptions: {
      output: {
        manualChunks: {
          'qr-scanner': ['qr-scanner'],
          'vendor': [
            'react',
            'react-dom',
            'react-router-dom',
            'zod',
            '@hookform/resolvers/zod',
            'react-hook-form',
            '@supabase/supabase-js'
          ]
        },
      },
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
