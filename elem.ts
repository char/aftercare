type GenericElement = HTMLElement | SVGElement;

type IsNullish<T> = [T] extends [null] ? true : [T] extends [undefined] ? true : false;
type IsFunctionIsh<T> =
  IsNullish<T> extends true
    ? false
    : // deno-lint-ignore ban-types
      T extends Function | null | undefined
      ? true
      : false;

export type ElementProps<E extends GenericElement> = {
  [K in keyof E as IsFunctionIsh<E[K]> extends true ? never : K]?: E[K];
};

export interface ElementExtras<E extends GenericElement> {
  classList?: string[];
  dataset?: Partial<Record<string, string>>;
  /** extra function to run on the element */
  _tap?: (elem: E) => void;
}

export type TagName = keyof HTMLElementTagNameMap;
export type CustomTagType<T extends GenericElement = GenericElement> = new () => T;
export type ElementType<T extends TagName | CustomTagType> = T extends TagName
  ? HTMLElementTagNameMap[T]
  : T extends CustomTagType<infer E>
    ? E
    : never;

export function elem<T extends TagName | CustomTagType>(
  tag: T,
  attrs: ElementProps<ElementType<T>> = {},
  children: (Element | string | Text)[] = [],
  extras: ElementExtras<ElementType<T>> = {},
): ElementType<T> {
  const element = typeof tag === "string" ? document.createElement(tag) : new tag();

  Object.assign(
    element,
    Object.fromEntries(Object.entries(attrs).filter(([_k, v]) => v !== undefined)),
  );

  if (extras.classList) extras.classList.forEach(c => element.classList.add(c));
  if (extras.dataset && (element instanceof HTMLElement || element instanceof SVGElement))
    Object.entries(extras.dataset)
      .filter(([_k, v]) => v !== undefined)
      .forEach(([k, v]) => (element.dataset[k] = v));

  const childNodes = children.map(e =>
    typeof e === "string" ? document.createTextNode(e) : e,
  );
  element.append(...childNodes);

  if (extras._tap) extras._tap(element as ElementType<T>);

  return element as ElementType<T>;
}

export function rewrite(element: Element, children: (Element | string | Text)[] = []) {
  element.innerHTML = "";
  const nodes = children.map(e => (typeof e === "string" ? document.createTextNode(e) : e));
  element.append(...nodes);
}
