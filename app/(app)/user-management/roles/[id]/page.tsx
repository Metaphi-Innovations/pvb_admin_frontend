"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  RecordDetailPage,
  RecordKvRow,
  RecordSectionCard,
  RecordMiniTable,
  OVERVIEW_TAB,
} from "@/components/record-detail";
import { Calendar, Clock, Globe, Shield, Users } from "lucide-react";
import { loadRoles, MOCK_USER_COUNTS, type Role } from "../roles-data";

function statusVariant(status: Role["status"]): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (status === "active") return "active";
  if (status === "inactive") return "inactive";
  if (status === "archived") return "blocked";
  return "neutral";
}

export default function RoleViewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [role, setRole] = useState<Role | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setRole(loadRoles().find((r) => r.id === Number(id)) ?? null);
  }, [id]);

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

  const userCount = MOCK_USER_COUNTS[role.id] ?? 0;
  const tabs = [
    OVERVIEW_TAB,
    { value: "approval", label: "Approval Chain", count: role.approvalChain.length },
  ];

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
        { icon: Users, iconBg: "#FFF4E6", iconColor: "#D96A10", value: String(userCount), label: "Users" },
        { icon: Shield, iconBg: "#E6F7EF", iconColor: "#1E9E61", value: String(role.approvalChain.length), label: "Approval Steps" },
        { icon: Globe, iconBg: "#E8F4FD", iconColor: "#1554B4", value: role.geoLevel, label: "Geo Level" },
        { icon: Calendar, iconBg: "#F3EEFF", iconColor: "#7C5CBF", value: role.createdDate, label: "Created" },
      ]}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEdit={() => router.push(`/user-management/roles/${role.id}/edit`)}
      sidebar={{
        quickActions: [
          {
            label: "View Permissions",
            icon: Shield,
            onClick: () => router.push(`/user-management/permissions/${role.id}`),
            variant: "primary",
          },
        ],
        summary: [
          { label: "Department", value: role.department, highlight: true },
          { label: "Geo Level", value: role.geoLevel },
          { label: "Users Assigned", value: String(userCount) },
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
      {activeTab === "overview" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecordSectionCard title="Role Information" icon={Shield} accent="blue">
            <RecordKvRow label="Role Name" value={role.roleName} highlight />
            <RecordKvRow label="Department" value={role.department} />
            <RecordKvRow label="Geo Level" value={role.geoLevel} isLast />
          </RecordSectionCard>
          <RecordSectionCard title="Audit" icon={Clock} accent="slate">
            <RecordKvRow label="Created By" value={role.createdBy} muted />
            <RecordKvRow label="Created Date" value={role.createdDate} mono />
            <RecordKvRow label="Updated By" value={role.updatedBy} muted />
            <RecordKvRow label="Updated Date" value={role.updatedDate} mono isLast />
          </RecordSectionCard>
        </div>
      ) : (
        <RecordSectionCard title="Approval Chain" icon={Shield} accent="orange">
          {role.approvalChain.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No approval chain configured.</p>
          ) : (
            <RecordMiniTable
              columns={[
                {
                  key: "step",
                  header: "Step",
                  render: (r) => (
                    <span>{role.approvalChain.findIndex((x) => x.uid === r.uid) + 1}</span>
                  ),
                },
                { key: "role", header: "Approver Role", render: (r) => r.roleName },
              ]}
              rows={role.approvalChain}
            />
          )}
        </RecordSectionCard>
      )}
    </RecordDetailPage>
  );
}
