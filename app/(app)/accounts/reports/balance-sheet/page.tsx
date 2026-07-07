import dynamic from "next/dynamic";

const BalanceSheetPageClient = dynamic(() => import("./BalanceSheetPageClient"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center h-full min-h-[200px] text-xs text-muted-foreground">
      Loading Balance Sheet…
    </div>
  ),
});

export default function BalanceSheetPage() {
  return <BalanceSheetPageClient />;
}
