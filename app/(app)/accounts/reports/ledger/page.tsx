import { redirect } from "next/navigation";

export default function LegacyGeneralLedgerPage() {
  redirect("/accounts/reports/general-ledger");
}
