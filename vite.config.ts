import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // 开发环境：把 /oauth 端点代理到 IAM，避免跨域
      "/oauth/token": {
        target: "https://iam.transcircle.org",
        changeOrigin: true,
      },
      "/oauth/userinfo": {
        target: "https://iam.transcircle.org",
        changeOrigin: true,
      },
    },
  },
});
