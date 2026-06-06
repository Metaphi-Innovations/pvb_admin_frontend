import { redirect } from "next/navigation";

export default function LegacyLedgerRedirect() {
  redirect("/accounts");
}
