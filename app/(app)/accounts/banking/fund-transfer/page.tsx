import { redirect } from "next/navigation";

/** Fund Transfer module removed — use Contra Voucher for bank/cash transfers. */
export default function FundTransferRedirectPage() {
  redirect("/accounts/banking/bank-accounts");
}
