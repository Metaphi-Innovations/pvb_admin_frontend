import { redirect } from "next/navigation";

/** Receipt allocation is part of the Receipt Voucher workflow. */
export default function ReceiptAllocationRedirectPage() {
  redirect("/accounts/vouchers?tab=receipt");
}
