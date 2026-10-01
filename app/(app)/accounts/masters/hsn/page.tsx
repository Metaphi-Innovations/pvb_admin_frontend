import { redirect } from "next/navigation";

/** HSN Master lives in ERP → Masters. */
export default function AccountsHsnMasterRedirect() {
  redirect("/masters/hsn");
}
