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
import { Building2, Clock, Pencil } from "lucide-react";
import type { Department } from "../components/DepartmentSheet";

const STORAGE_KEY = "ds_departments_v2";

const SEED: Department[] = [
  { id: 1, departmentUuid: "d1", name: "Accounts", status: "active", remarks: "", createdBy: "Admin", createdDate: "2024-01-15", updatedBy: "Admin", updatedDate: "2024-01-15" },
  { id: 2, departmentUuid: "d2", name: "HR", status: "active", remarks: "", createdBy: "Admin", createdDate: "2024-01-12", updatedBy: "Admin", updatedDate: "2024-01-12" },
  { id: 3, departmentUuid: "d3", name: "Procurement", status: "active", remarks: "", createdBy: "Admin", createdDate: "2024-01-18", updatedBy: "Admin", updatedDate: "2024-01-18" },
  { id: 4, departmentUuid: "d4", name: "Warehouse", status: "active", remarks: "", createdBy: "Admin", createdDate: "2024-02-01", updatedBy: "Admin", updatedDate: "2024-02-01" },
  { id: 5, departmentUuid: "d5", name: "Admin", status: "active", remarks: "", createdBy: "Admin", createdDate: "2024-02-05", updatedBy: "Admin", updatedDate: "2024-02-05" },
];

function loadDepartments(): Department[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as Department[];
  } catch {
    return SEED;
  }
}

export default function DepartmentViewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [dept, setDept] = useState<Department | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setDept(loadDepartments().find((d) => d.id === Number(id)) ?? null);
  }, [id]);

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

  return (
    <RecordDetailPage
      listHref="/user-management/department"
      listLabel="Departments"
      recordName={dept.name}
      statusLabel={dept.status.charAt(0).toUpperCase() + dept.status.slice(1)}
      statusVariant={dept.status === "active" ? "active" : "inactive"}
      tabs={[OVERVIEW_TAB]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEdit={() => router.push(`/user-management/department?edit=${dept.id}`)}
      sidebar={{
        quickActions: [
          {
            label: "Edit Department",
            icon: Pencil,
            onClick: () => router.push(`/user-management/department?edit=${dept.id}`),
            variant: "outline",
          },
        ],
        summary: [
          { label: "Status", value: dept.status },
          { label: "Created", value: dept.createdDate },
        ],
        activity: [
          {
            id: "status",
            title: "Last updated",
            subtitle: dept.updatedBy,
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
