"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { RecordDetailPage, OVERVIEW_TAB } from "@/components/record-detail";
import { CheckSquare, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadRoles, type Role } from "../../roles/roles-data";

const PERMISSION_MODULES = [
  "Dashboard",
  "Masters",
  "Procurement",
  "Sales",
  "HR",
  "Accounts",
  "Farmer",
  "Event",
  "Demo",
  "Settings",
];

const PERMISSION_ACTIONS = ["View", "Create", "Edit", "Delete", "Approve", "Export"];

/** Deterministic demo permissions from role id */
function roleHasPermission(roleId: number, module: string, action: string): boolean {
  const seed = (roleId * 31 + module.length * 7 + action.length * 13) % 100;
  if (action === "View") return seed > 15;
  if (action === "Create" || action === "Edit") return seed > 45;
  if (action === "Delete" || action === "Approve") return seed > 70;
  return seed > 55;
}

export default function PermissionViewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [role, setRole] = useState<Role | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setRole(loadRoles().find((r) => r.id === Number(id)) ?? null);
  }, [id]);

  const grantedCount = useMemo(() => {
    if (!role) return 0;
    let n = 0;
    PERMISSION_MODULES.forEach((m) => {
      PERMISSION_ACTIONS.forEach((a) => {
        if (roleHasPermission(role.id, m, a)) n += 1;
      });
    });
    return n;
  }, [role]);

  if (!role) {
    return (
      <RecordDetailPage
        listHref="/user-management/roles"
        listLabel="Roles"
        recordName="Permissions"
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
      recordName={`${role.roleName} Permissions`}
      statusLabel={role.status.charAt(0).toUpperCase() + role.status.slice(1)}
      statusVariant={role.status === "active" ? "active" : "inactive"}
      metaItems={[{ label: role.department, icon: Shield }]}
      kpis={[
        {
          icon: CheckSquare,
          iconBg: "#FFF4E6",
          iconColor: "#D96A10",
          value: String(grantedCount),
          label: "Granted",
        },
        {
          icon: Shield,
          iconBg: "#E6F7EF",
          iconColor: "#1E9E61",
          value: String(PERMISSION_MODULES.length),
          label: "Modules",
        },
        {
          icon: CheckSquare,
          iconBg: "#E8F4FD",
          iconColor: "#1554B4",
          value: String(PERMISSION_ACTIONS.length),
          label: "Actions",
        },
      ]}
      tabs={[OVERVIEW_TAB]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEdit={() => router.push(`/user-management/roles/${role.id}/edit`)}
      sidebar={{
        summary: [
          { label: "Role", value: role.roleName, highlight: true },
          { label: "Department", value: role.department },
          { label: "Permissions Granted", value: String(grantedCount) },
        ],
        activity: [],
      }}
    >
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <p className="text-xs font-semibold text-foreground">Module Permission Matrix</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Read-only permission view for role configuration.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Module</th>
                {PERMISSION_ACTIONS.map((action) => (
                  <th key={action} className="px-3 py-2.5 text-center font-semibold text-muted-foreground">
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MODULES.map((module) => (
                <tr key={module} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium text-foreground">{module}</td>
                  {PERMISSION_ACTIONS.map((action) => {
                    const granted = roleHasPermission(role.id, module, action);
                    return (
                      <td key={action} className="px-3 py-2.5 text-center">
                        <span
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-md border text-[10px] font-bold",
                            granted
                              ? "bg-brand-50 border-brand-200 text-brand-700"
                              : "bg-muted/30 border-border text-muted-foreground/40",
                          )}
                        >
                          {granted ? "✓" : "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RecordDetailPage>
  );
}
