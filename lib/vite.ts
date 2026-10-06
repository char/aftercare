import * as path from "node:path";
import { normalizePath, type Plugin } from "npm:vite@^8.3.1";

export default function aftercare(): Plugin {
  const jsx = { runtime: "automatic", importSource: "@char/aftercare" } as const;

  return {
    name: "aftercare",
    config(userConfig, { mode }) {
      const root = normalizePath(path.resolve(userConfig.root ?? process.cwd()));
      const development = mode === "development";

      // Vite's dependency scanner does not inherit the main transform's JSX settings.
      return {
        define: { __AFTERCARE_ROOT__: development ? JSON.stringify(root) : "undefined" },
        oxc: { jsx: { ...jsx, development } },
        optimizeDeps: { rolldownOptions: { transform: { jsx: { ...jsx, development } } } },
      };
    },
  };
}
