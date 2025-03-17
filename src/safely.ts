// deno-lint-ignore-file no-explicit-any
export function safely<Args extends any[], R>(
  f: (...args: Args) => R,
): (...args: Args) => [ok: R, err: undefined] | [ok: undefined, err: Error] {
  return (...args) => {
    try {
      return [f(...args), undefined] as const;
    } catch (err) {
      return [undefined, err as Error] as const;
    }
  };
}
