import {
  type CustomTagType,
  elem,
  type ElementEventListeners,
  type ElementExtras,
  type ElementProps,
  type ElementType,
  type TagName,
} from "./elem.ts";

type ElementAttributes<T extends TagName | CustomTagType> = Omit<
  ElementProps<ElementType<T>>,
  keyof ElementExtras<ElementType<T>>
> &
  ElementExtras<ElementType<T>> &
  ElementEventListeners<ElementType<T>>;

// deno-lint-ignore no-namespace
namespace JSX {
  export type Element = HTMLElement | SVGElement;
  export type Child = JSX.Element | Element | string | Text;
  export type IntrinsicElements = {
    [K in TagName]: Omit<ElementAttributes<K>, "children"> & {
      children?: JSX.Child | JSX.Child[] | undefined;
    };
  };
}

function Fragment(_props: Record<string, unknown>, _key?: string): never {
  throw new Error("fragments are not supported!");
}

function jsx<T extends TagName | CustomTagType>(
  tag: T,
  props: Record<string, unknown>,
  _key?: string,
): ElementType<T> {
  const { children = [], classList, dataset, style, _tap, ...attrs } = props;
  const childrenArray = Array.isArray(children) ? children : [children];
  const extras = { classList, dataset, style, _tap } as ElementExtras<ElementType<T>> &
    ElementEventListeners<ElementType<T>>;
  for (const key of Object.keys(attrs)) {
    if (!key.startsWith("_on")) continue;
    // @ts-expect-error blind assignment
    extras[key] = attrs[key];
    delete attrs[key];
  }
  return elem(tag, attrs as ElementProps<ElementType<T>>, childrenArray, extras);
}

export { Fragment, jsx, jsx as jsxDEV, jsx as jsxs };
export type { JSX };
