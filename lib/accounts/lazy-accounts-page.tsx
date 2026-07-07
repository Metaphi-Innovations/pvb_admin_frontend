import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { PageContentSkeleton } from "@/components/layout/PageContentSkeleton";

/** Code-split accounts page clients — keeps navigation clicks responsive. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyAccountsPage(loader: () => Promise<{ default: ComponentType<any> }>) {
  return dynamic(loader, {
    ssr: false,
    loading: () => <PageContentSkeleton />,
  });
}
