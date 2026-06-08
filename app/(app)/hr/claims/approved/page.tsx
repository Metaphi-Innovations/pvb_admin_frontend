import { redirect } from "next/navigation";

/** Approved claim payments are handled via the global Approval Center. */
export default function ApprovedClaimsRedirect() {
  redirect("/dashboard");
}
