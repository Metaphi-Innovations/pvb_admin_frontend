import { redirect } from "next/navigation";

/** Orphaned demo Payment Runs — no active workflow links. */
export default function PaymentRunsRedirectPage() {
  redirect("/accounts/payables/outstanding");
}
