import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const JournalRegisterPageClient = lazyAccountsPage(() => import("./JournalRegisterPageClient"));

export default function JournalRegisterReportPage() {
  return <JournalRegisterPageClient />;
}
