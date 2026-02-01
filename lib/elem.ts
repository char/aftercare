import type * as CSS from "npm:csstype@3.2.3";
import { effect, Signal, type SignalLike } from "./signal.ts";

// prettier-ignore
type Eq<A, B> =
  (<G>() => G extends A ? 1 : 2) extends 
  (<G>() => G extends B ? 1 : 2) ? 
  true : false;

// prettier-ignore
type WritableKeysOf<T> = {
  [P in keyof T]: Eq<
    { [Q in P]: T[P] },
    { readonly [Q in P]: T[P] }
  > extends false ? P : never;
}[keyof T];

// prettier-ignore
type Signalable<T> =
  T extends string | number
    ? T | SignalLike<T>
  : T extends boolean
    ? T | SignalLike<boolean>
  : T;
type DeepSignalable<T extends object> = {
  [K in keyof T]: T[K] extends object ? DeepSignalable<T[K]> : Signalable<T[K]>;
};

/** a union type representing either an HTML element or an SVG element. */
export type GenericElement = HTMLElement | SVGElement;

// prettier-ignore
type CSSDeclaration =
  & DeepSignalable<CSS.Properties>
  & { [prop: `--${string}`]: Signalable<string>; };

// prettier-ignore
type DirectElementProps<E extends GenericElement> = {
  [K in WritableKeysOf<E> as K extends string
      ? K extends `_${string}` ? never
      : K extends ("style" | "classList" | "dataset" | "innerHTML" | "outerHTML" | "checked" | "value" | "valueAsNumber") ? never
      : NonNullable<E[K]> extends Function ? never
      : K
    : never]?: Signalable<E[K]>;
};
type AuxElementProps<E extends GenericElement> = {
  class?: Signalable<string>;
  classList?: (string | undefined)[];
  style?: CSSDeclaration;
  dataset?: Record<string, Signalable<string>>;
  _innerHTML?: Signalable<string>;
  _outerHTML?: Signalable<string>;
  _also?: (element: E) => void;
} & AuxInputElementProps<E>;
type AuxInputElementProps<E extends GenericElement> = E extends HTMLInputElement
  ? {
      checked?: Signalable<boolean>;
      value?: Signalable<string>;
      valueAsNumber?: Signalable<number>;
    }
  : {};
type ElementEvents<E extends GenericElement> = {
  [K in keyof HTMLElementEventMap as K extends string ? `_on${K}` : never]?: (
    this: E,
    ev: HTMLElementEventMap[K],
  ) => void;
};
// prettier-ignore
/** properties that may be passed to DOM elements for creation via {@link elem}. */
export type ElementProps<E extends GenericElement> = 
  DirectElementProps<E> &
  AuxElementProps<E> &
  ElementEvents<E>;

/**
 * a type to map from a tag name to a {@link GenericElement}.
 *
 * this type merges the standard DOM maps, while excluding SVG tags that overlap with HTML tags
 * (e.g., 'a', 'button', 'div').
 */
export type GenericElementMap = HTMLElementTagNameMap & { svg: SVGSVGElement };

/**
 * a union type of all valid HTML and SVG element tag names supported by {@link elem}.
 *
 * this represents the keys of {@link GenericElementMap}, which includes all standard
 * HTML tag names as well as some SVG-specific tag names that don't overlap with HTML.
 */
export type TagName = keyof GenericElementMap;

/** T can be a {@link TagName} or the name of an unknown custom element. */
export type ElementType<T extends TagName | `${string}-${string}`> =
  T extends keyof GenericElementMap ? GenericElementMap[T] : GenericElement;

/** any type that can be a child in the parameters to {@link elem} */
export type ElementChild = Node | Node[] | string | Signal<string>;
/** helper function to convert an {@link ElementChild} into something that can be `append(..)`ed */
export const elemChildConversion = (child: ElementChild): Node[] => {
  if (typeof child === "string") {
    return [document.createTextNode(child)];
  }
  if (child instanceof Signal) {
    const node = document.createTextNode(child.get());
    child.weakSubscribe(new WeakRef(node), (node, v) => (node.textContent = v));
    return [node];
  }
  if (Array.isArray(child)) {
    return child.flatMap(c => elemChildConversion(c));
  }
  return [child];
};

/**
 * create a DOM element with the specified tag, attributes, and children.
 *
 * {@link Signal|signals} can be passed to primitive attributes and to the children array
 * to achieve automatic DOM updates after the completion of {@link effect|effects}.
 *
 * ```typescript
 * import { Signal, elem, effect } from "@char/aftercare";
 * const count = new Signal(0);
 * const button = elem("button", {
 *   _onclick: () => effect(() => count.set(count.get() + 1))
 * }, [count.derive(n => `Clicked ${n} times`)]);
 * document.body.append(button);
 * ```
 *
 * **CAVEAT:** since `elem(..)` calls are evaluated inside-out, and SVG elements need to be
 * created using the SVG namespace explicitly, it's impossible to create SVG elements which
 * shadow HTML tag names. you can use ``elem("svg", { _outerHTML: `<svg ...` })`` instead.
 */
export function elem<const Tag extends TagName | `${string}-${string}`>(
  tag: Tag,
  props: ElementProps<ElementType<Tag>> = {},
  children: ElementChild[] = [],
): ElementType<Tag> {
  const element = (
    tag === "svg"
      ? document.createElementNS("http://www.w3.org/2000/svg", tag)
      : document.createElement(tag)
  ) as ElementType<Tag>;

  for (const prop of Object.keys(props)) {
    if (prop.startsWith("_")) continue;
    const value = (props as any)[prop];
    switch (prop) {
      case "style": {
        for (const [k, v] of Object.entries(value)) {
          if (k.startsWith("--")) {
            if (v instanceof Signal) {
              element.style.setProperty(k, v.get());
              v.weakSubscribe(new WeakRef(element), (e, v) => e.style.setProperty(k, v));
            } else {
              element.style.setProperty(k, String(v));
            }

            continue;
          }

          setValue(element, k, v, e => e.style);
        }
        break;
      }
      case "classList": {
        for (const v of value) {
          if (v === undefined) continue;
          element.classList.add(v);
        }
        break;
      }
      case "dataset": {
        for (const [k, v] of Object.entries(value)) setValue(element, k, v, e => e.dataset);
        break;
      }
      case "class": {
        setValue(element, "className", value);
        break;
      }
      case "checked":
      case "valueAsNumber":
      case "value": {
        if (element instanceof HTMLInputElement) {
          if (value instanceof Signal) {
            let skip = false;
            value.weakSubscribe(new WeakRef(element), (e, v) => {
              if (skip) return;
              // @ts-expect-error can't specify generic here
              e[prop] = v;
            });
            element.addEventListener("input", () => {
              try {
                skip = true;
                effect(() => value.set(element[prop]));
              } finally {
                skip = false;
              }
            });
            // @ts-expect-error can't specify generic
            element[prop] = value.get();
          } else {
            setValue(element, prop, value);
          }
        } else {
          setValue(element, prop, value);
        }
        break;
      }
      default: {
        if (prop.includes("-")) {
          if (value instanceof Signal) {
            value.weakSubscribe(new WeakRef(element), (e, v) => e.setAttribute(prop, v));
            element.setAttribute(prop, value.get());
          } else {
            element.setAttribute(prop, value);
          }
        } else {
          setValue(element, prop, value);
        }
      }
    }
  }

  if (props._innerHTML !== undefined) setValue(element, "innerHTML", props._innerHTML);
  if (props._outerHTML !== undefined) setValue(element, "outerHTML", props._outerHTML);

  element.append(...children.flatMap(elemChildConversion));

  for (const k of Object.keys(props)) {
    if (!k.startsWith("_on")) continue;
    const eventName = k.substring("_on".length);
    const callback = (props as any)[k] as Function;
    element.addEventListener(eventName, ev => callback.call(element, ev));
  }

  if (props._also) props._also(element);

  return element;
}

function setValue<O extends object>(
  obj: O,
  key: string,
  value: unknown,
  drill?: (o: O) => object,
) {
  if (value instanceof Signal) {
    // @ts-expect-error untyped access
    (drill ? drill(obj) : obj)[key] = value.get();
    value.weakSubscribe(new WeakRef(obj), (obj, curr) => {
      // @ts-expect-error untyped access
      (drill ? drill(obj) : obj)[key] = curr;
    });
  } else {
    // @ts-expect-error untyped access
    (drill ? drill(obj) : obj)[key] = value;
  }
}
