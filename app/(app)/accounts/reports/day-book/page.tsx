import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const DayBookPageClient = lazyAccountsPage(() => import("./DayBookPageClient"));

export default function DayBookPage() {
  return <DayBookPageClient />;
}
