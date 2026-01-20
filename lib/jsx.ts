/**
 * jsx runtime for creating reactive dom elements
 *
 * provides type definitions and functions for using jsx with {@link elem},
 * allowing you to write declarative components with automatic signal reactivity.
 */
import {
  elem,
  type ElementProps,
  type GenericElement,
  type GenericElementMap,
  type TagName,
} from "./elem.ts";
import type { SignalLike } from "./signal.ts";

type DOMElement = Element; // Element is shadowed in the JSX namespace later

/**
 * JSX namespace as required by `react-jsx` strategy
 *
 * @see {@link jsx}
 */
// deno-lint-ignore no-namespace
namespace JSX {
  /** @see {@link jsx} */
  export type Element = GenericElement;

  /** @see {@link jsx} */
  export type Child = Node | Node[] | string | SignalLike<string>;
  type ContainsChildren = { children?: JSX.Child | JSX.Child[] };

  type _HTMLMap = HTMLElementTagNameMap;
  type HTMLElements = {
    [K in keyof _HTMLMap]: ElementProps<_HTMLMap[K]> & ContainsChildren;
  };
  type CustomHTMLElements = {
    [K: `${string}-${string}`]: ElementProps<GenericElement> & ContainsChildren;
  };
  type SVGElements = {
    // to avoid footguns, we only support void svgs (use an _outerHTML parameter)
    svg: ElementProps<SVGSVGElement> & { children?: [] };
  };
  /** @see {@link jsx} */
  export type IntrinsicElements = HTMLElements & CustomHTMLElements & SVGElements;
}

/** fragments are not supported - this function throws if called */
function Fragment(_props: Record<string, unknown>, _key?: string): never {
  throw new Error("fragments are not supported!");
}

/**
 * render jsx tags and function components
 *
 * handles both html/svg tags and function components, automatically extracting
 * children and passing them to {@link elem}.
 *
 * ```typescript
 * import { Signal, effect } from "@char/aftercare";
 * const count = new Signal(0);
 * const button = <button _onclick={() => effect(() => count.set(count.get() + 1))}>
 *   {count.derive(n => `Clicked ${n} times`)}
 * </button>;
 * document.body.append(button);
 * ```
 */
function jsx<T extends TagName | ((props: Record<string, unknown>) => JSX.Element)>(
  tag: T,
  props: Record<string, unknown>,
  _key?: string,
): JSX.Element {
  // function components
  if (typeof tag === "function") return tag(props);

  const { children = [], ...attrs } = props;
  const childrenArray = Array.isArray(children) ? children : [children];
  return (elem as any)(tag, attrs, childrenArray);
}

export { Fragment, jsx, jsx as jsxDEV, jsx as jsxs };
export type { JSX };
