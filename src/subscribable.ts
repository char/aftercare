export type Subscription<T> = (value: T) => unknown | Promise<unknown>;

class SubscribableBase<A, B extends A> {
  #listeners: Set<Subscription<B>> = new Set();

  constructor(private value: A) {}

  get(): A {
    return this.value;
  }

  set(newValue: B) {
    this.value = newValue;
    for (const listener of this.#listeners) {
      try {
        void listener(newValue);
      } catch {
        // ignore
      }
    }
  }

  subscribe(listener: Subscription<B>): { unsubscribe: () => void } {
    const listeners = this.#listeners;
    listeners.add(listener);
    return {
      unsubscribe() {
        listeners.delete(listener);
      },
    };
  }
}

export class Subscribable<T> extends SubscribableBase<T, T> {
  subscribeImmediate(listener: Subscription<T>): ReturnType<typeof this.subscribe> {
    listener(this.get());
    return this.subscribe(listener);
  }
}
export class LateSubscribable<T> extends SubscribableBase<T | undefined, T> {
  constructor() {
    super(undefined);
  }

  subscribeImmediate(listener: Subscription<T>): ReturnType<typeof this.subscribe> {
    const value = this.get();
    if (value) listener(value);
    return this.subscribe(listener);
  }
}
