import dynamic from "next/dynamic";
import { PageContentSkeleton } from "@/components/layout/PageContentSkeleton";

const AuditTrailPageClient = dynamic(() => import("./AuditTrailPageClient"), {
  loading: () => <PageContentSkeleton />,
});

export default function AuditTrailReportPage() {
  return <AuditTrailPageClient />;
}
