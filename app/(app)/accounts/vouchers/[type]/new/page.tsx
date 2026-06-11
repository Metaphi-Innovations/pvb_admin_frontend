import { redirect } from "next/navigation";

export default function LegacyVoucherNewPage() {
  redirect("/accounts/vouchers/journal/new");
}
