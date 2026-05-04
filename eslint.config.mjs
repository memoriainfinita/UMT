import { defineConfig } from "eslint/config";
import js from "@eslint/js";

export default defineConfig([
  js.configs.recommended,
  {
    files: ["lib/**/*.ts"],
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "no-unreachable": "warn",
      "no-constant-condition": "warn",
    },
    languageOptions: {
      globals: { console: "readonly" }
    }
  },
  {
    ignores: ["node_modules/**", "archive/**", "api-docs/**", "dist/**"]
  }
]);
