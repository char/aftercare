# aftercare

makes the dom nicer

a microframework for client-side frontend development. around 3kb minified

## features

- deno-based
- turnkey esbuild bundling system
- reactive signals
- strongly-typed element creation helpers
- jsx runtime

## example

```tsx
// main.tsx

// esbuild resolves + bundles jsr/npm/https imports:
import { assertEquals } from "jsr:@std/assert";
assertEquals(2, 1 + 1);

import { Signal } from "@char/aftercare";

const count = new Signal(0);
const counter = (
  <div style={{ display: "flex", gap: "1em", marginBottom: "1em" }}>
    <button type="button" _onclick={() => count.mut(n => n - 1)} innerText="-" />
    Clicked {count.str()} times!
    <button type="button" _onclick={() => count.mut(n => n + 1)} innerText="+" />
  </div>
);
document.body.append(counter);
document.body.append(
  <button type="button" _onclick={() => count.set(0)}>
    Reset
  </button>,
);
```

```html
<!DOCTYPE html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<!-- index.html -->
<script src="./dist/main.js" type="module"></script>
```

```shell
$ deno run -A jsr:@char/aftercare/bundle -i ./main.tsx -o ./dist --watch --serve .
```
