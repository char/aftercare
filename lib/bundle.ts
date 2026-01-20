import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.11.1";
import * as cli from "jsr:@std/cli@1.0.25";
import * as dotenv from "jsr:@std/dotenv@0.225.6";
import * as esbuild from "npm:esbuild@0.27.2";

export interface BuildOptions {
  in: esbuild.BuildOptions["entryPoints"];
  outDir: string;
  watch?: boolean;
  serve?: esbuild.ServeOptions & { quiet?: boolean };
  plugins?: esbuild.Plugin[];
  overrides?: Partial<esbuild.BuildOptions>;
}

export async function build(opts: BuildOptions) {
  const buildOpts = {
    bundle: true,
    minify: true,
    splitting: true,
    target: "es2022",
    platform: "browser",
    format: "esm",
    keepNames: true,
    sourcemap: "linked",
    legalComments: "none",
    plugins: [...(opts.plugins ?? []), ...(denoPlugins() as esbuild.Plugin[])],
    jsx: "automatic",
    jsxImportSource: "@char/aftercare",
    entryPoints: opts.in,
    outdir: opts.outDir,
    ...(opts.overrides ?? {}),
  } satisfies esbuild.BuildOptions;

  if (opts.watch) {
    const ctx = await esbuild.context(buildOpts);
    await ctx.watch();
    if (opts.serve) {
      if (!opts.serve.quiet)
        console.log(`Serving on http://${opts.serve.host}:${opts.serve.port}/ ...`);
      await ctx.serve(opts.serve);
    }
  } else {
    await esbuild.build(buildOpts);
  }
}

/**
 * plugin to access build-time variables from .env files
 *
 * use like so:
 * ```typescript
 * import _aftercareEnv from "data:$aftercare-env,";
 * const env = _aftercareEnv as Record<string, string>;
 * Object.assign(import.meta, { env });
 * declare global {
 *   interface ImportMetaEnv {
 *     [key: string]: string;
 *   }
 *   var env: ImportMetaEnv;
 * }
 * ```
 */
export const envPlugin = (files: string[]): esbuild.Plugin => ({
  name: "env",
  setup: build => {
    build.onResolve({ filter: /^\$data:aftercare-env/ }, args => {
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

if (import.meta.main) {
  const args = cli.parseArgs(Deno.args, {
    boolean: ["watch"],
    string: ["bind", "in", "out", "serve"],
    collect: ["in"],
    default: { bind: "127.0.0.1:3000" },
    alias: { i: "in", o: "out" },
  });

  const createServeInfo = (bind: string) => {
    let hostAndPort: { host: string; port: number };
    if (bind.indexOf(":") === -1) {
      hostAndPort = { host: "127.0.0.1", port: parseInt(bind) };
    } else {
      const [host, port] = bind.split(":");
      hostAndPort = { host, port: parseInt(port) };
    }
    return { ...hostAndPort, servedir: args.serve, fallback: args.serve + "/index.html" };
  };
  const serve = args.serve ? createServeInfo(args.bind) : undefined;

  if (!args.in.length) throw new Error("please supply --in");

  await build({
    watch: args.watch,
    serve,
    in: args.in,
    outDir: args.out ?? "./web/dist",
    plugins: [envPlugin([".env", ".env.local"])],
  });
}
