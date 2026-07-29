import { redirect } from "next/navigation";

/** TDS Master lives in ERP → Masters. */
export default function AccountsTdsMasterRedirect() {
  redirect("/masters/tds");
}
