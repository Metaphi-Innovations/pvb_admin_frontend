"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import type { ComponentProps } from "react";

type PrefetchLinkProps = ComponentProps<typeof Link>;

/**
 * Next.js Link + explicit prefetch on hover/focus (helps flyout menu items).
 */
export function PrefetchLink({ href, onMouseEnter, onFocus, ...rest }: PrefetchLinkProps) {
  const router = useRouter();
  const prefetched = useRef(false);

  const prefetch = useCallback(() => {
    if (prefetched.current || typeof href !== "string") return;
    prefetched.current = true;
    router.prefetch(href);
  }, [href, router]);

  return (
    <Link
      href={href}
      prefetch
      scroll={false}
      onMouseEnter={(e) => {
        prefetch();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        prefetch();
        onFocus?.(e);
      }}
      {...rest}
    />
  );
}
