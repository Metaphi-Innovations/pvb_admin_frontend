import { redirect } from "next/navigation";

/** Product ledger is not an Accounts report — inventory value lives in Stock Valuation (Batch Register view). */
export default function ProductInventoryLedgerRedirectPage() {
  redirect("/accounts/reports/stock-valuation");
}
