export type Subscription<T> = (value: T) => unknown | Promise<unknown>;

class SignalBase<A, B extends A> {
  #listeners: Set<Subscription<B>> = new Set();

  #value: A;

  constructor(value: A) {
    this.#value = value;
  }

  get(): A {
    return this.#value;
  }

  set(newValue: B) {
    this.#value = newValue;
    for (const listener of this.#listeners) {
      try {
        void listener(newValue);
      } catch {
        // ignore
      }
    }
  }

  subscribe(
    listener: Subscription<B>,
    opts: { signal?: AbortSignal } = {},
  ): { unsubscribe: () => void } {
    const listeners = this.#listeners;
    listeners.add(listener);

    const subscription = {
      unsubscribe() {
        listeners.delete(listener);
      },
    };

    if (opts.signal) {
      opts.signal.addEventListener("abort", () => subscription.unsubscribe());
    }

    return subscription;
  }

  get value(): A {
    return this.get();
  }

  set value(newValue: B) {
    this.set(newValue);
  }
}

export class Signal<T> extends SignalBase<T, T> {
  subscribeImmediate(listener: Subscription<T>): ReturnType<typeof this.subscribe> {
    listener(this.get());
    return this.subscribe(listener);
  }
}
export class LazySignal<T> extends SignalBase<T | undefined, T> {
  constructor() {
    super(undefined);
  }

  subscribeImmediate(listener: Subscription<T>): ReturnType<typeof this.subscribe> {
    const value = this.get();
    if (value) listener(value);
    return this.subscribe(listener);
  }
}
