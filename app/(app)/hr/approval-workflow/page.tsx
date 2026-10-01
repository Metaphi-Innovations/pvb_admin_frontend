import { redirect } from "next/navigation";

/** Approvals are handled in the global Approval Center (top nav Approvals badge). */
export default function ApprovalWorkflowRedirect() {
  redirect("/dashboard");
}
