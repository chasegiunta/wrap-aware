import { resolve } from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ command, mode }) => {
  const isLibrary = mode === "library";

  return {
    plugins: [vue()],

    build: isLibrary
      ? {
          lib: {
            entry: resolve(__dirname, "src/main.ts"),
            name: "WrapAware",
            fileName: "index",
          },
          outDir: "dist",
        }
      : {
          outDir: "docs-dist",
        },

    server: {
      open: !isLibrary,
    },

    // root: isLibrary ? undefined : "docs",
  };
});
