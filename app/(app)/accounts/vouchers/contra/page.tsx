import { redirect } from "next/navigation";

/** Dedicated contra list URL redirects to the vouchers hub Contra tab (API-backed). */
export default function ContraVoucherPage() {
  redirect("/accounts/vouchers?tab=contra");
}
