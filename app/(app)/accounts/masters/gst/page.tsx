import { redirect } from "next/navigation";

/** GST Master lives in ERP → Masters. */
export default function AccountsGstMasterRedirect() {
  redirect("/masters/gst");
}
