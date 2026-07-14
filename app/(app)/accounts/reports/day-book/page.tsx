import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const DayBookPageClient = lazyAccountsPage(() => import("./DayBookPageClient"));

export default function DayBookPage() {
  // #region agent log
  fetch("http://127.0.0.1:7502/ingest/b60215f3-a2ea-4dec-b0ac-4488ce88b732", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8fbc9e" },
    body: JSON.stringify({
      sessionId: "8fbc9e",
      runId: "daybook-404",
      hypothesisId: "H-B",
      location: "day-book/page.tsx",
      message: "DayBookPage render",
      data: { clientType: typeof DayBookPageClient },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return <DayBookPageClient />;
}
