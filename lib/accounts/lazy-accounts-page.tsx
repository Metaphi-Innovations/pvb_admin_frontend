import dynamic from "next/dynamic";
import type { ComponentType } from "react";

type LazyAccountsPageOptions = {
  label?: string;
  pathnameHint?: string;
  /** @deprecated Page-level loading removed — listings show loading inside tables. */
  listing?: boolean;
};

/** Code-split accounts page clients — keeps navigation clicks responsive. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyAccountsPage(
  loader: () => Promise<{ default: ComponentType<any> }>,
  _options?: LazyAccountsPageOptions,
) {
  return dynamic(loader, {
    ssr: false,
    loading: () => null,
  });
}
