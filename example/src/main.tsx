import { assertEquals } from "jsr:@std/assert";
assertEquals(2, 1 + 1);

import { Signal } from "@char/aftercare";

const counter = new Signal(0);
const increment = () => counter.value++;
const decrement = () => counter.value--;
const showCounter = (span: HTMLElement) =>
  counter.subscribeImmediate(v => (span.textContent = v + ""));

document.body.append(
  <div style={{ display: "flex", gap: "0.5em" }}>
    <button type="button" _onclick={decrement}>
      -
    </button>
    <span _tap={showCounter} />
    <button type="button" _onclick={increment}>
      +
    </button>
  </div>,
);
