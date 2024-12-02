# aftercare

makes the dom nicer

## features

- deno/esbuild build system
- reactive subscribable values
- jsx runtime

## setup

```typescript
// src/main.tsx

// esbuild resolves + bundles jsr/npm/https imports:
import { assertEquals } from "jsr:@std/assert";
assertEquals(2, 1 + 1);

// you can create DOM nodes using JSX
document.body.append(<div>
  hello, world!
</div>)
```

build with `deno run -A jsr:@char/aftercare/esbuild --in src/main.tsx`
