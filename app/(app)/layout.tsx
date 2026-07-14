import { AppShell } from "@/components/layout/AppShell";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // #region agent log
  fetch("http://127.0.0.1:7502/ingest/b60215f3-a2ea-4dec-b0ac-4488ce88b732", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8fbc9e" },
    body: JSON.stringify({
      sessionId: "8fbc9e",
      runId: "post-fix",
      hypothesisId: "H23",
      location: "app/(app)/layout.tsx",
      message: "AppGroupLayout using AppShell",
      data: { appShellType: typeof AppShell },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return <AppShell>{children}</AppShell>;
}
