import { redirect } from "next/navigation";
import { purchaseReturnListHref } from "../purchase-returns/purchase-return-utils";

export default function PurchaseReturnsRedirectPage() {
  redirect(purchaseReturnListHref());
}
