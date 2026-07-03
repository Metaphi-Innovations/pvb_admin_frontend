import dynamic from "next/dynamic";

const CashFlowPageClient = dynamic(() => import("./CashFlowPageClient"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center h-full min-h-[200px] text-xs text-muted-foreground">
      Loading Cash Flow…
    </div>
  ),
});

export default function CashFlowReportPage() {
  return <CashFlowPageClient />;
}
