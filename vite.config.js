import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { geminiIssueApiPlugin } from "./server/geminiIssueApi.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      geminiIssueApiPlugin({
        apiKey: env.GEMINI_API_KEY,
        githubToken: env.GITHUB_TOKEN,
        model: env.GEMINI_MODEL || "gemini-3.1-flash-lite"
      })
    ],
    server: {
      host: "127.0.0.1"
    }
  };
});
