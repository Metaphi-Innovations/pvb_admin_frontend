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
import { Building2, Mail, Phone, Shield, Users } from "lucide-react";
import { loadUsers, type UserRecord } from "../user-data";
import { loadRoles } from "../../roles/roles-data";
import GeographyAssignmentSection from "../components/GeographyAssignmentSection";
import ReportingAssignmentSection from "../components/ReportingAssignmentSection";

function statusVariant(status: string): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (status === "active") return "active";
  if (status === "inactive") return "inactive";
  return "neutral";
}

export default function UserViewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserRecord | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setUser(loadUsers().find((u) => u.id === Number(id)) ?? null);
  }, [id]);

  if (!user) {
    return (
      <RecordDetailPage
        listHref="/user-management/user"
        listLabel="Users"
        recordName="User not found"
        statusLabel="—"
        statusVariant="neutral"
        tabs={[OVERVIEW_TAB]}
        activeTab="overview"
        onTabChange={() => {}}
        sidebar={{}}
      >
        <p className="text-sm text-muted-foreground py-8 text-center">
          User not found.{" "}
          <Link href="/user-management/user" className="text-brand-600 hover:underline">
            Back to listing
          </Link>
        </p>
      </RecordDetailPage>
    );
  }

  const tabs = [
    OVERVIEW_TAB,
    { value: "access", label: "Access & Geography" },
  ];

  const roleRecord = loadRoles().find((r) => r.roleName === user.role);

  return (
    <RecordDetailPage
      listHref="/user-management/user"
      listLabel="Users"
      recordName={user.fullName}
      recordCode={user.employeeId}
      statusLabel={user.status.charAt(0).toUpperCase() + user.status.slice(1)}
      statusVariant={statusVariant(user.status)}
      metaItems={[
        { label: user.email, icon: Mail, href: `mailto:${user.email}` },
        { label: user.mobile, icon: Phone, href: `tel:${user.mobile}` },
        { label: user.department, icon: Building2 },
        { label: user.role, icon: Shield },
      ]}
      kpis={[
        { icon: Users, iconBg: "#FFF4E6", iconColor: "#D96A10", value: String(user.stateAccess.length), label: "States" },
        { icon: Users, iconBg: "#E8F4FD", iconColor: "#1554B4", value: String(user.territoryAccess.length), label: "Territories" },
        { icon: Shield, iconBg: "#E6F7EF", iconColor: "#1E9E61", value: user.role, label: "Role" },
        { icon: Building2, iconBg: "#F3EEFF", iconColor: "#7C5CBF", value: user.department, label: "Department" },
      ]}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEdit={() => router.push(`/user-management/user/add?id=${user.id}`)}
      sidebar={{
        quickActions: [
          {
            label: "View Role Permissions",
            icon: Shield,
            onClick: () =>
              router.push(
                roleRecord
                  ? `/user-management/permissions/${roleRecord.id}`
                  : "/user-management/roles",
              ),
            variant: "outline",
          },
        ],
        summary: [
          { label: "Reporting Manager", value: user.reportingManager, highlight: true },
          { label: "Department", value: user.department },
          { label: "Role", value: user.role },
          { label: "Created", value: user.createdDate },
          { label: "Updated", value: user.updatedDate },
        ],
        activity: [
          {
            id: "created",
            title: "User created",
            subtitle: `By ${user.createdBy}`,
            date: user.createdDate,
          },
          {
            id: "updated",
            title: "Last updated",
            subtitle: `By ${user.updatedBy}`,
            date: user.updatedDate,
          },
        ],
      }}
    >
      {activeTab === "overview" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecordSectionCard title="User Details" icon={Users} accent="blue">
            <RecordKvRow label="Full Name" value={user.fullName} highlight />
            <RecordKvRow label="Employee ID" value={user.employeeId} mono />
            <RecordKvRow label="Email" value={user.email} link href={`mailto:${user.email}`} />
            <RecordKvRow label="Mobile" value={user.mobile} mono link href={`tel:${user.mobile}`} />
            <RecordKvRow label="Department" value={user.department} />
            <RecordKvRow label="Role" value={user.role} isLast />
          </RecordSectionCard>
          <RecordSectionCard title="Audit" icon={Building2} accent="slate">
            <RecordKvRow label="Created By" value={user.createdBy} muted />
            <RecordKvRow label="Created Date" value={user.createdDate} mono />
            <RecordKvRow label="Updated By" value={user.updatedBy} muted />
            <RecordKvRow label="Updated Date" value={user.updatedDate} mono isLast />
          </RecordSectionCard>
        </div>
      ) : (
        <div className="space-y-6">
          <GeographyAssignmentSection
            role={user.role}
            employeeName={user.fullName}
            isInactive={user.status !== "active"}
            onToast={() => {}}
          />
          <ReportingAssignmentSection
            role={user.role}
            employeeId={user.id}
            employeeName={user.fullName}
            employeeInitials={user.fullName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
            isInactive={user.status !== "active"}
            onToast={() => {}}
          />
        </div>
      )}
    </RecordDetailPage>
  );
}
