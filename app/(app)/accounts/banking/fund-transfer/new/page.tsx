import { redirect } from "next/navigation";

/** New fund transfers are recorded via Contra Voucher. */
export default function NewFundTransferRedirectPage() {
  redirect("/accounts/vouchers?tab=contra");
}
