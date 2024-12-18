import {
  type CustomTagType,
  elem,
  type ElementExtras,
  type ElementProps,
  type ElementType,
  type TagName,
} from "./elem.ts";

// deno-lint-ignore no-namespace
namespace JSX {
  export type Element = HTMLElement | SVGElement;
  export type IntrinsicElements = {
    [K in TagName]: Omit<ElementProps<ElementType<K>>, "children"> & {
      children?: JSX.Element | JSX.Element[] | undefined;
    } & Partial<ElementExtras<ElementType<K>>>;
  };
}

function Fragment(props: Record<string, unknown>, _key?: string): never {
  return jsx(undefined, props, _key) as never;
}

function jsx<T extends TagName | CustomTagType>(
  tag: T | undefined,
  props: Record<string, unknown>,
  _key?: string,
): ElementType<T> {
  if (tag === undefined) {
    throw new Error("fragments are not supported");
  }

  const { children = [], classList, dataset, _tap, ...attrs } = props;
  const childrenArray = Array.isArray(children) ? children : [children];
  const extras = { classList, dataset, _tap } as ElementExtras<ElementType<T>>;
  return elem(tag, attrs as ElementProps<ElementType<T>>, childrenArray, extras);
}

export { Fragment, jsx, jsx as jsxDEV, jsx as jsxs };
export type { JSX };
