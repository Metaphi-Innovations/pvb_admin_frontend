"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  RecordDetailPage,
  RecordKvRow,
  RecordSectionCard,
  OVERVIEW_TAB,
} from "@/components/record-detail";
import { Building2, Pencil } from "lucide-react";
import type { Department } from "../department-data";
import { toDepartmentRecord } from "../department-data";
import { useDepartment } from "@/hooks/user-management";

export default function DepartmentViewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const departmentQuery = useDepartment(id);
  const [activeTab, setActiveTab] = useState("overview");
  const [dept, setDept] = useState<Department | null>(null);

  useEffect(() => {
    if (departmentQuery.data) {
      setDept(toDepartmentRecord(departmentQuery.data));
    }
  }, [departmentQuery.data]);

  if (departmentQuery.isLoading) {
    return (
      <RecordDetailPage
        listHref="/user-management/department"
        listLabel="Departments"
        recordName="Loading…"
        statusLabel="—"
        statusVariant="neutral"
        tabs={[OVERVIEW_TAB]}
        activeTab="overview"
        onTabChange={() => { }}
        sidebar={{}}
      >
        <p className="text-sm text-muted-foreground text-center py-8">Loading department…</p>
      </RecordDetailPage>
    );
  }

  if (!dept) {
    return (
      <RecordDetailPage
        listHref="/user-management/department"
        listLabel="Departments"
        recordName="Not found"
        statusLabel="—"
        statusVariant="neutral"
        tabs={[OVERVIEW_TAB]}
        activeTab="overview"
        onTabChange={() => { }}
        sidebar={{}}
      >
        <p className="text-sm text-muted-foreground text-center py-8">
          <Link href="/user-management/department" className="text-brand-600 hover:underline">
            Back to departments
          </Link>
        </p>
      </RecordDetailPage>
    );
  }

  const editHref = `/user-management/department?edit=${dept.departmentUuid || dept.id}`;

  return (
    <RecordDetailPage
      listHref="/user-management/department"
      listLabel="Departments"
      recordName={dept.name}
      recordCode={dept.departmentUuid || String(dept.id)}
      statusLabel={dept.status.charAt(0).toUpperCase() + dept.status.slice(1)}
      statusVariant={dept.status === "active" ? "active" : "inactive"}
      tabs={[OVERVIEW_TAB]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEdit={() => router.push(editHref)}
      sidebar={{
        quickActions: [
          {
            label: "Edit Department",
            icon: Pencil,
            onClick: () => router.push(editHref),
            variant: "outline",
          },
        ],
        summary: [
          { label: "Status", value: dept.status },
          { label: "Updated", value: dept.updatedDate },
          { label: "Created", value: dept.createdDate },
        ],
        activity: [
          {
            id: "updated",
            title: "Last updated",
            subtitle: dept.updatedBy,
            date: dept.updatedDate,
            date: dept.updatedDate,
          },
        ],
      }}
    >
      <RecordSectionCard title="Department Details" icon={Building2} accent="blue">
        <RecordKvRow label="Name" value={dept.name} highlight />
        <RecordKvRow label="Remarks" value={dept.remarks || "—"} />
        <RecordKvRow label="Created By" value={dept.createdBy} muted />
        <RecordKvRow label="Created Date" value={dept.createdDate} mono />
        <RecordKvRow label="Updated By" value={dept.updatedBy} muted />
        <RecordKvRow label="Updated Date" value={dept.updatedDate} mono isLast />
      </RecordSectionCard>
    </RecordDetailPage>
  );
}
