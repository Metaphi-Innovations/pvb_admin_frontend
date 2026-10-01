import { redirect } from "next/navigation";

/** Fund Transfer detail removed — redirect to Contra Voucher listing. */
export default function FundTransferDetailRedirectPage() {
  redirect("/accounts/vouchers?tab=contra");
}
