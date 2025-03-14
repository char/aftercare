type GenericElement = HTMLElement | SVGElement;

// prettier-ignore
type IsEqual<A, B> =
  (<G>() => G extends A ? 1 : 2) extends 
  (<G>() => G extends B ? 1 : 2) ? 
  true : false;

// prettier-ignore
type WritableKeysOf<T> = {
  [P in keyof T]: IsEqual<
    { [Q in P]: T[P] },
    { readonly [Q in P]: T[P] }
  > extends false ? P : never;
}[keyof T];

export type ElementProps<E extends GenericElement> = {
  // deno-lint-ignore ban-types
  [K in WritableKeysOf<E> as NonNullable<E[K]> extends Function ? never : K]?: E[K];
};

export interface ElementExtras<E extends GenericElement> {
  classList?: (string | undefined)[];
  style?: {
    // prettier-ignore
    [K in WritableKeysOf<CSSStyleDeclaration>
      as K extends string
        ? CSSStyleDeclaration[K] extends string ? K : never
        : never
    ]?: CSSStyleDeclaration[K];
  } & {
    [prop: `--${string}`]: string | undefined;
  };
  dataset?: Partial<Record<string, string>>;
  /** extra function to run on the element */
  _tap?: (elem: E) => void;
}

export type ElementEventListeners<E extends GenericElement> = {
  [K in keyof HTMLElementEventMap as K extends string ? `_on${K}` : never]?: (
    this: E,
    ev: HTMLElementEventMap[K],
  ) => void;
};

export type TagName = keyof HTMLElementTagNameMap;
export type CustomTagType<T extends GenericElement = GenericElement> = new () => T;
export type ElementType<T extends TagName | CustomTagType | undefined> = T extends TagName
  ? HTMLElementTagNameMap[T]
  : T extends CustomTagType<infer E>
    ? E
    : never;

export function elem<T extends TagName | CustomTagType>(
  tag: T,
  attrs: ElementProps<ElementType<T>> = {},
  children: (Element | string | Text)[] = [],
  extras: ElementExtras<ElementType<T>> & ElementEventListeners<ElementType<T>> = {},
): ElementType<T> {
  const element = typeof tag === "string" ? document.createElement(tag) : new tag();

  Object.assign(
    element,
    Object.fromEntries(Object.entries(attrs).filter(([_k, v]) => v !== undefined)),
  );

  if (extras.classList) extras.classList.forEach(c => c && element.classList.add(c));
  if (extras.dataset && (element instanceof HTMLElement || element instanceof SVGElement))
    Object.entries(extras.dataset)
      .filter(([_k, v]) => v !== undefined)
      .forEach(([k, v]) => (element.dataset[k] = v));

  const childNodes = children.map(e =>
    typeof e === "string" ? document.createTextNode(e) : e,
  );
  element.append(...childNodes);

  if (extras._tap) extras._tap(element as ElementType<T>);

  if (extras.style)
    Object.entries(extras.style).forEach(([k, v]) =>
      k.startsWith("--")
        ? v
          ? element.style.setProperty(k, v)
          : element.style.removeProperty(k)
        : // @ts-expect-error blind assignment
          (element.style[k] = v),
    );

  for (const [key, value] of Object.entries(extras)) {
    if (!key.startsWith("_on")) continue;
    element.addEventListener(key.substring(3), value.bind(element));
  }

  return element as ElementType<T>;
}

export function rewrite(element: Element, children: (Element | string | Text)[] = []) {
  element.innerHTML = "";
  const nodes = children.map(e => (typeof e === "string" ? document.createTextNode(e) : e));
  element.append(...nodes);
}
