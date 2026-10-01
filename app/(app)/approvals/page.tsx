import dynamic from "next/dynamic";

const ApprovalsPageClient = dynamic(() => import("./ApprovalsPageClient"), {
  ssr: false,
  loading: () => (
    <div className="px-5 py-4 text-xs text-muted-foreground">Loading approvals…</div>
  ),
});

export default function ApprovalsPage() {
  return <ApprovalsPageClient />;
}
