import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    // Note: Custom manualChunks were removed — they caused a production
    // "Cannot read properties of undefined (reading 'createContext')" error
    // because React ended up loading after libraries that depend on it.
    // Route-level lazy loading in App.tsx already provides the main code-split win.
  },
}));
