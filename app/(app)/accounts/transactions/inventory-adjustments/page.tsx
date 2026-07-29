import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const InventoryAdjustmentsPage = lazyAccountsPage(() => import("./InventoryAdjustmentsPage"));

export default function Page() {
  return <InventoryAdjustmentsPage />;
}
