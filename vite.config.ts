import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "integration-tests/**/*.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
