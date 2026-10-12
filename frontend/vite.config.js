import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "credentialless",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
  worker: {
    format: "es", // requis pour que le worker puisse faire des imports ESM
  },
  build: {
    target: "esnext",
  },
  resolve: {
    dedupe: ["@huggingface/transformers"], // une seule instance chargée, même si ffmpeg.wasm ou autre en dépend aussi
  },
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
});