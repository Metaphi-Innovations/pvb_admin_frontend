import dynamic from "next/dynamic";

const TrialBalancePageClient = dynamic(() => import("./TrialBalancePageClient"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center h-full min-h-[200px] text-xs text-muted-foreground">
      Loading Trial Balance…
    </div>
  ),
});

export default function TrialBalancePage() {
  return <TrialBalancePageClient />;
}
