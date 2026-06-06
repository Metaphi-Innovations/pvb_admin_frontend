"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const FLASH_MESSAGES: Record<string, string> = {
  "pr-submitted": "Purchase request submitted.",
  "pr-draft": "Draft saved.",
  "pr-saved": "Purchase request saved.",
  "po-submitted": "Purchase order submitted.",
  "po-draft": "Draft saved.",
  "po-saved": "Purchase order saved.",
  "po-approved": "Purchase order approved.",
  "po-rejected": "Purchase order rejected.",
  "po-short-closed": "PO short closed successfully.",
  "pr-approved": "Purchase request approved.",
  "pr-rejected": "Purchase request rejected.",
};

/** Shows a one-time toast from `?toast=` query param, then clears the URL. */
export function useFlashToast(
  setToast: (t: { msg: string; type: "success" | "error" } | null) => void,
) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("toast");
    if (!key) return;
    setToast({ msg: FLASH_MESSAGES[key] ?? "Done.", type: "success" });
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);
}
