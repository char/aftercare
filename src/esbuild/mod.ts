import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.11";
import * as cli from "jsr:@std/cli@1";
import * as esbuild from "npm:esbuild@0.24";
import { cssPlugin, envPlugin } from "./plugins.ts";

export * from "./plugins.ts";

export interface BuildOptions {
  watch?: boolean;
  serve?: esbuild.ServeOptions;
  plugins?: esbuild.Plugin[];
  in: esbuild.BuildOptions["entryPoints"];
  outDir: string; // directory
  extraOptions?: Partial<esbuild.BuildOptions>;
}

export async function build(opts: BuildOptions) {
  const buildOpts = {
    bundle: true,
    minify: true,
    splitting: true,
    target: "esnext",
    platform: "browser",
    format: "esm",
    keepNames: true,
    sourcemap: "linked",
    plugins: [...(opts.plugins ?? []), ...denoPlugins()],
    entryPoints: opts.in,
    outdir: opts.outDir,
    legalComments: "none",
    jsx: "automatic",
    jsxImportSource: "@char/aftercare",
    ...(opts.extraOptions ?? {}),
  } satisfies esbuild.BuildOptions;

  if (opts.watch) {
    const ctx = await esbuild.context(buildOpts);
    await ctx.watch();
    if (opts.serve) {
      console.log(`Serving on http://${opts.serve.host}:${opts.serve.port}/ ...`);
      await ctx.serve(opts.serve);
    }
  } else {
    await esbuild.build(buildOpts);
  }
}

if (import.meta.main) {
  const args = cli.parseArgs(Deno.args, {
    boolean: ["watch", "serve"],
    string: ["bind"],
    collect: ["in"],
    default: { bind: "127.0.0.1:3000" },
  });

  const createServeInfo = (bind: string) => {
    let hostAndPort: { host: string; port: number };
    if (bind.indexOf(":") === -1) {
      hostAndPort = { host: "127.0.0.1", port: parseInt(bind) };
    } else {
      const [host, port] = bind.split(":");
      hostAndPort = { host, port: parseInt(port) };
    }
    return { ...hostAndPort, servedir: "./web", fallback: "./web/index.html" };
  };
  const serve = args.serve ? createServeInfo(args.bind) : undefined;

  await build({
    watch: args.watch,
    serve,
    in: args.in ? (args.in as string[]) : ["./src/main.ts"],
    outDir: "./web/dist",
    plugins: [envPlugin([".env", ".env.local"]), cssPlugin()],
  });
}
