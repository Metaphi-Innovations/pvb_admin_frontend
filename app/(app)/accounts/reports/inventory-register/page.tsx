import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const InventoryRegisterPageClient = lazyAccountsPage(() => import("./InventoryRegisterPageClient"));

export default function InventoryRegisterPage() {
  return <InventoryRegisterPageClient />;
}
