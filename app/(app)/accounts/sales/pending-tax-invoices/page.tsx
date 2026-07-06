import dynamic from "next/dynamic";
import { PageContentSkeleton } from "@/components/layout/PageContentSkeleton";

const PendingTaxInvoicesClient = dynamic(() => import("./PendingTaxInvoicesClient"), {
  loading: () => <PageContentSkeleton />,
});

export default function PendingTaxInvoicesPage() {
  return <PendingTaxInvoicesClient />;
}
