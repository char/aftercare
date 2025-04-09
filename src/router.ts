import { LazySignal } from "./signal.ts";

export abstract class Router<Route extends object> {
  readonly route: LazySignal<Route> = new LazySignal();

  abstract parseRoute(path: string): Route;
  abstract getPathForRoute(route: Route): string;

  navigateTo(pathOrRoute: string | Route) {
    const isPath = typeof pathOrRoute === "string";
    const path = isPath ? pathOrRoute : this.getPathForRoute(pathOrRoute);
    const route = isPath ? this.parseRoute(pathOrRoute) : pathOrRoute;

    history.pushState(null, "", path);
    globalThis.scrollTo(0, 0);

    this.route.set(route);
  }

  install() {
    document.addEventListener(
      "click",
      e => {
        if (!(e.target instanceof Element)) return;
        const anchor = e.target.closest("a");
        if (anchor === null) return;
        if (e.ctrlKey || e.button !== 0) return;

        const url = new URL(anchor.href);
        if (location.origin !== url.origin) return; // open external links normally

        e.preventDefault();
        this.navigateTo(url.pathname);
      },
      { signal: this.#dispose.signal },
    );

    globalThis.addEventListener(
      "popstate",
      () => {
        const parsedRoute = this.parseRoute(location.pathname);
        this.route.set(parsedRoute);
      },
      { signal: this.#dispose.signal },
    );
  }

  #dispose = new AbortController();
  dispose() {
    this.#dispose.abort();
  }
}
