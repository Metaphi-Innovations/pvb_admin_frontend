import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const EmployeeClaimsPageClient = lazyAccountsPage(() => import("./EmployeeClaimsPageClient"));

export default function Page() {
  return <EmployeeClaimsPageClient />;
}
