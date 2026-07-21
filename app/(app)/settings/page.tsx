import dynamic from "next/dynamic";

const SettingsPageClient = dynamic(() => import("./SettingsPageClient"), {
  ssr: false,
  loading: () => (
    <div className="px-5 py-4 text-xs text-muted-foreground">Loading settings…</div>
  ),
});

export default function SettingsPage() {
  return <SettingsPageClient />;
}
