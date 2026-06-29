import { redirect } from "next/navigation";

/** Legacy route — GRN & QC module was split into separate GRN and QC pages. */
export default function GrnQcLegacyRedirect() {
  redirect("/warehouse/grn");
}
