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
import { Calendar, Clock, Globe, Shield } from "lucide-react";
import { useRole } from "@/hooks/user-management";
import { toRoleRecord } from "../role-api-data";

function statusVariant(status: string): "active" | "inactive" | "neutral" {
  if (status === "active") return "active";
  if (status === "inactive") return "inactive";
  return "neutral";
}

export default function RoleViewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const roleQuery = useRole(id);
  const [activeTab, setActiveTab] = useState("overview");

  const role = roleQuery.data ? toRoleRecord(roleQuery.data) : null;

  if (roleQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        Loading role…
      </div>
    );
  }

  if (!role) {
    return (
      <RecordDetailPage
        listHref="/user-management/roles"
        listLabel="Roles"
        recordName="Role not found"
        statusLabel="—"
        statusVariant="neutral"
        tabs={[OVERVIEW_TAB]}
        activeTab="overview"
        onTabChange={() => {}}
        sidebar={{}}
      >
        <p className="text-sm text-muted-foreground py-8 text-center">
          <Link href="/user-management/roles" className="text-brand-600 hover:underline">
            Back to roles
          </Link>
        </p>
      </RecordDetailPage>
    );
  }

  return (
    <RecordDetailPage
      listHref="/user-management/roles"
      listLabel="Roles"
      recordName={role.roleName}
      statusLabel={role.status.charAt(0).toUpperCase() + role.status.slice(1)}
      statusVariant={statusVariant(role.status)}
      metaItems={[
        { label: role.department, icon: Shield },
        { label: role.geoLevel, icon: Globe },
      ]}
      kpis={[
        { icon: Globe, iconBg: "#E8F4FD", iconColor: "#1554B4", value: role.geoLevel, label: "Geo Level" },
        { icon: Calendar, iconBg: "#F3EEFF", iconColor: "#7C5CBF", value: role.createdDate, label: "Created" },
      ]}
      tabs={[OVERVIEW_TAB]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEdit={() => router.push(`/user-management/roles/${role.roleUuid}/edit`)}
      sidebar={{
        summary: [
          { label: "Department", value: role.department, highlight: true },
          { label: "Geo Level", value: role.geoLevel },
          { label: "Created", value: role.createdDate },
          { label: "Updated", value: role.updatedDate },
        ],
        activity: [
          {
            id: "created",
            title: "Role created",
            subtitle: role.createdBy,
            date: role.createdDate,
          },
          {
            id: "updated",
            title: "Last updated",
            subtitle: role.updatedBy,
            date: role.updatedDate,
          },
        ],
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecordSectionCard title="Role Information" icon={Shield} accent="blue">
          <RecordKvRow label="Role Name" value={role.roleName} highlight />
          <RecordKvRow label="Department" value={role.department} />
          <RecordKvRow label="Geo Level" value={role.geoLevel} />
          <RecordKvRow label="Description" value={role.description || "—"} isLast />
        </RecordSectionCard>
        <RecordSectionCard title="Audit" icon={Clock} accent="slate">
          <RecordKvRow label="Created By" value={role.createdBy} muted />
          <RecordKvRow label="Created Date" value={role.createdDate} mono />
          <RecordKvRow label="Updated By" value={role.updatedBy} muted />
          <RecordKvRow label="Updated Date" value={role.updatedDate} mono isLast />
        </RecordSectionCard>
      </div>
    </RecordDetailPage>
  );
}
