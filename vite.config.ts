// vite.config.js
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve("src/main.ts"),
      name: "WrapAware",
      fileName: "index",
    },
  },
});
