import { redirect } from "next/navigation";
import { purchaseReturnListHref } from "../purchase-returns/purchase-return-utils";

/** Legacy route — redirects to Purchase Order > Purchase Return tab. */
export default function LegacyReturnsPage() {
  redirect("/procurement/purchase-orders?tab=po_return");
}
