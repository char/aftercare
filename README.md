# aftercare

makes the dom nicer

## features

- deno/esbuild build system
- reactive signals
- jsx runtime

## example

```tsx
// src/main.tsx

// esbuild resolves + bundles jsr/npm/https imports:
import { assertEquals } from "jsr:@std/assert";
assertEquals(2, 1 + 1);

// Signals have reactive behavior (set(..) calls all subscribe(..) listeners)
import { Signal } from "jsr:@char/aftercare";

const counter = new Signal(0);
const decrement = () => counter.set(counter.get() - 1);
const increment = () => counter.set(counter.get() + 1);
const showCounter = (span: HTMLElement) =>
  counter.subscribeImmediate(value => (span.innerText = value + ""));

document.body.append(
  <div>
    <button _tap={b => b.addEventListener("click", decrement)}>-</button>
    <span _tap={showCounter} />
    <button _tap={b => b.addEventListener("click", increment)}>+</button>
  </div>,
);
```

```html
<!doctype html>
<!-- web/index.html -->
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<script type="module" src="/dist/main.js"></script>
```

build like so:

```shell
$ deno run -A jsr:@char/aftercare/esbuild --in src/main.tsx
```
