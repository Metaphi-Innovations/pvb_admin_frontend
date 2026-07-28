import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";
import { isValidGstr3bDrillKey } from "../gstr3b-report-types";
import { notFound } from "next/navigation";

const Gstr3bDrillPageClient = lazyAccountsPage(() => import("../components/Gstr3bDrillPageClient"));

export default function Gstr3bDrillPage({ params }: { params: { bucket: string } }) {
  if (!isValidGstr3bDrillKey(params.bucket)) notFound();
  return <Gstr3bDrillPageClient />;
}
