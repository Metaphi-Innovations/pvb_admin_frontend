import dynamic from "next/dynamic";

const GstTaxConfigPageClient = dynamic(() => import("./GstTaxConfigPageClient"), {
  ssr: false,
  loading: () => (
    <div className="px-5 py-4 text-xs text-muted-foreground">Loading GST configuration…</div>
  ),
});

export default function GstTaxConfigurationPage() {
  return <GstTaxConfigPageClient />;
}
