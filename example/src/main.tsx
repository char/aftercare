import { assertEquals } from "jsr:@std/assert";
assertEquals(2, 1 + 1);

import { Subscribable } from "@char/aftercare";

const counter = new Subscribable(0);
const decrement = () => counter.set(counter.get() - 1);
const increment = () => counter.set(counter.get() + 1);

document.body.append(
  <div>
    <button _tap={b => b.addEventListener("click", decrement)}>-</button>
    <span
      _tap={s =>
        // set text whenever the counter changes
        counter.subscribeImmediate(counterValue => {
          s.innerText = counterValue + "";
        })
      }
    />
    <button _tap={b => b.addEventListener("click", increment)}>+</button>
  </div>,
);
