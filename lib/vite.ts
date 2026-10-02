import type { Plugin } from "npm:vite@^8.3.1";

export default function aftercare(): Plugin {
  const jsx = { runtime: "automatic", importSource: "@char/aftercare" } as const;

  return {
    name: "aftercare",
    config() {
      // Vite's dependency scanner does not inherit the main transform's JSX settings.
      return {
        oxc: { jsx },
        optimizeDeps: { rolldownOptions: { transform: { jsx } } },
      };
    },
  };
}
