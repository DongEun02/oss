import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { localApiPlugin } from "./server/localApi.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      localApiPlugin({
        apiKey: env.NVIDIA_API_KEY,
        githubToken: env.GITHUB_TOKEN,
        model: env.NVIDIA_MODEL || "nvidia/nemotron-3-ultra-550b-a55b"
      })
    ],
    server: {
      host: "127.0.0.1"
    }
  };
});
