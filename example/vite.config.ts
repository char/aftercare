import aftercare from "@char/aftercare/vite";
import deno from "npm:@deno/vite-plugin@^2.0.4";
import { defineConfig } from "npm:vite@^8.3.1";

export default defineConfig({
  cacheDir: ".vite",
  plugins: [deno(), aftercare()],
});
