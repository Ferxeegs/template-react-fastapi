import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        // This will transform your SVG to a React component
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  server: {
    host: "0.0.0.0", // Allow access from outside container
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/v1': {
        target: 'http://backend-dev:8000',
        changeOrigin: true,
        ws: true,
      },
    },
    watch: {
      // Use polling for file watching in Docker (better compatibility)
      usePolling: true,
      interval: 1000, // Poll every 1 second
      ignored: ["**/node_modules/**", "**/.git/**"],
    },
    hmr: {
      // Enable HMR (Hot Module Replacement) for Docker
      // Client akan connect melalui nginx di port 80
      clientPort: 80,
      protocol: "ws",
    },
    // Increase timeout for large files
    fs: {
      strict: false,
      allow: [".."], // Allow access to files outside of project root
    },
  },
  // Optimize build performance
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router"],
        },
      },
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router",
      "@vitejs/plugin-react",
    ],
    exclude: [
      "lightningcss", // Exclude lightningcss dari pre-bundling karena native module
    ],
  },
});

