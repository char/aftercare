class EffectContext {
  dirty: Set<Signal<any>> = new Set();
  static current = new Set<EffectContext>();
}

const derived = Symbol.for("aftercare.signal.derived");
/**
 * a reactive signal which holds a value and notifies subscribers when it changes.
 *
 * ```typescript
 * const count = new Signal(0);
 *
 * count.subscribe((current, old) => {
 *   console.log(`Changed from ${old} to ${current}`);
 * });
 *
 * effect(() => {
 *   count.set(10);
 *   count.set(1);
 * }); // Logs: "Changed from 0 to 1"
 * ```
 *
 * **CAVEAT:** if the effect stack is empty, signal subscribers will be immediately notified
 * on any set(..) operation. if you rely on this, ensure you aren't ever running concurrent
 * with an unrelated long-running effect: subscribers will not see writes until termination of
 * concurrent effects.
 */
export class Signal<T> {
  /** @ignore */
  [derived]: (() => void)[] = [];

  #subscriptions: ((curr: T, old: T) => void)[] = [];
  #v: T;
  #old: T | undefined;

  constructor(v: T) {
    this.#v = v;
  }

  /** get the current value of the signal */
  get(): T {
    return this.#v;
  }

  /**
   * set the value of the signal
   *
   * if the new value is different from the current value, all subscribers are notified.
   * Redundant subscriber notifications are dropped if a signal updates multiple times within
   * one effect context.
   *
   * @param value - The new value to set.
   */
  set(value: T): void {
    const old = this.#v;
    if (old === value) return;

    this.#old ??= old;
    this.#v = value;
    this[derived].forEach(it => it());

    if (EffectContext.current.size === 0) {
      this.notify();
      return;
    }
    for (const c of EffectContext.current) c.dirty.add(this);
  }

  /** syntactic sugar - `set(f(get()))` */
  mut(f: (v: T) => T): void {
    this.set(f(this.get()));
  }

  /**
   * notify all subscribers of the value change
   *
   * you should not need to call this method manually, since it's automatically called upon
   * completion of an effect for all dirty signals.
   */
  notify(): void {
    if (this.#old === undefined) return;
    for (const sub of this.#subscriptions) sub(this.#v, this.#old);
    this.#old = undefined;
  }

  /**
   * subscribe to changes in the signal's value
   *
   * ```typescript
   * const signal = new Signal(0);
   * const { unsubscribe } = signal.subscribe((curr, old) => {
   *   console.log(`Value changed from ${old} to ${curr}`);
   * });
   *
   * effect(() => signal.set(1)); // logs: "Value changed from 0 to 1"
   * unsubscribe(); // stop listening for changes
   * ```
   */
  subscribe(listener: (curr: T, old: T) => void): { unsubscribe: () => void } {
    this.#subscriptions.push(listener);
    return {
      unsubscribe: () => {
        const idx = this.#subscriptions.indexOf(listener);
        if (idx === -1) return;
        this.#subscriptions.splice(idx, 1);
      },
    };
  }

  /**
   * subscribe to signal changes using a weak reference to an object
   *
   * the subscription automatically unsubscribes when the object is garbage collected, which is
   * avoids memory leaks when the Signal lives longer than the reference (and therefore keeps
   * it alive & in memory via closure capture of the listener function).
   *
   * you must still be careful to not capture extra state in the listener.
   * any external variables referenced _will_ live at least as long as the signal itself.
   */
  weakSubscribe<O extends WeakKey>(
    o: WeakRef<O>,
    listener: (o: O, curr: T, old: T) => void,
  ): void {
    const { unsubscribe } = this.subscribe((curr, old) => {
      const obj = o.deref();
      if (!obj) {
        unsubscribe();
        return;
      }
      listener(obj, curr, old);
    });
  }

  /**
   * create a derived signal that transforms the parent signal's value
   *
   * ```typescript
   * const count = new Signal(5);
   * const doubled = count.derive(n => n * 2);
   * const text = count.derive(n => `Count is ${n}`);
   *
   * console.log(doubled.get()); // 10
   * console.log(text.get());    // "Count is 5"
   *
   * count.set(10);
   * console.log(doubled.get()); // 20
   * console.log(text.get());    // "Count is 10"
   * ```
   */
  derive<T_>(transform: (v: T) => T_): Signal<T_> {
    return new DerivedSignal(this, transform);
  }

  /** helper method (equiv. `.derive(String)`) */
  str(): Signal<string> {
    return this.derive(String);
  }
}

/**
 * execute a function while tracking signal writes to batch notifications
 *
 * ```typescript
 * const count = new Signal(0);
 * const doubled = count.derive(n => n * 2);
 * doubled.subscribe((old, curr) => console.log(`doubled count was ${old}, now ${curr}.`))
 *
 * effect(() => {
 *   count.set(5); // redundant write, since it happens in the same effect
 *   count.set(10);
 * });
 * // log: doubled count was 0, now 20.
 * ```
 */
export function effect(exec: () => void): void {
  const ctx = new EffectContext();
  EffectContext.current.add(ctx);
  try {
    exec();
  } finally {
    EffectContext.current.delete(ctx);
    for (const signal of ctx.dirty) signal.notify();
  }
}

/**
 * a signal derived from another signal through a transformation function
 * @see {@link Signal.derive}
 */
export class DerivedSignal<A, B> extends Signal<A> {
  constructor(
    public parent: Signal<B>,
    public transform: (v: B) => A,
  ) {
    super(transform(parent.get()));
    parent[derived].push(() => this.set(transform(parent.get())));
  }

  override derive<T_>(transform: (v: A) => T_): Signal<T_> {
    return this.parent.derive(v => transform(this.transform(v)));
  }
}

// Use structural typing to accept any signal with correct methods, without needing to match
// implementation types for structural equality.
export type SignalLike<T> = Signal<any> & Omit<Signal<T>, `#${string}`>;
