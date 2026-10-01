import { PageContentSkeleton } from "@/components/layout/PageContentSkeleton";

/**
 * Segment loading for Employee routes — content pane only.
 * Parent `hr/layout.tsx` keeps the sidebar shell mounted.
 */
export default function EmployeesLoading() {
  return <PageContentSkeleton />;
}
