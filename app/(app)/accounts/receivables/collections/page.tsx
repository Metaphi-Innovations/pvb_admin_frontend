import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const CollectionTrackingClient = lazyAccountsPage(() => import("./CollectionTrackingClient"));

export default function Page() {
  return <CollectionTrackingClient />;
}
