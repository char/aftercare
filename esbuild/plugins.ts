import * as dotenv from "jsr:@std/dotenv@0.225";
import * as path from "jsr:@std/path@1";
import type * as esbuild from "npm:esbuild@0.24";

export const envPlugin = (files: string[]): esbuild.Plugin => ({
  name: "env",
  setup: build => {
    build.onResolve({ filter: /^build-system-env$/ }, args => {
      return {
        path: args.path,
        namespace: "env-ns",
        watchFiles: files,
      };
    });

    build.onLoad({ filter: /.*/, namespace: "env-ns" }, async () => {
      const env = {};
      for (const file of files) {
        try {
          const loaded = await dotenv.load({ envPath: file, export: false });
          Object.assign(env, loaded);
        } catch {
          // ignore
        }
      }

      return {
        contents: JSON.stringify(env),
        loader: "json",
      };
    });
  },
});

export const cssPlugin = (): esbuild.Plugin => ({
  name: "css",
  setup: build => {
    const options = build.initialOptions;
    options.loader = { ...options.loader, ".woff": "file", ".woff2": "file" };

    build.onResolve({ filter: /\.css$/ }, args => {
      if (args.path.startsWith("https://")) {
        return { path: args.path, external: true };
      }

      return { path: path.join(args.resolveDir, args.path) };
    });

    build.onLoad({ filter: /\.css$/ }, args => {
      const loader = args.path.endsWith(".css") ? "css" : "file";
      return { loader };
    });
  },
});
