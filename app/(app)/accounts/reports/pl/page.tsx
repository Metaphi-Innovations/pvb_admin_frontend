import dynamic from "next/dynamic";

const ProfitLossPageClient = dynamic(() => import("./ProfitLossPageClient"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center h-full min-h-[200px] text-xs text-muted-foreground">
      Loading Profit & Loss…
    </div>
  ),
});

export default function ProfitLossPage() {
  return <ProfitLossPageClient />;
}
