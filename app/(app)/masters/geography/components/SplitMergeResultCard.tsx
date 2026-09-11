"use client";

import { AlertTriangle, Users, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  isInheritedSplitMergeRole,
  type SplitMergeLevel,
} from "../geography-workflow-data";
import { QuickAddUserModal } from "./QuickAddUserModal";

export type UserAssignAction = "keep" | "assign" | "unassigned";

export interface RoleUserAssignment {
  action: UserAssignAction;
  userId: string;
}

export interface SplitMergeCardPreview {
  key: string;
  name: string;
  level: SplitMergeLevel;
  parentName: string;
  isExisting: boolean;
  assignedScopeLabels: string[];
  pincodeCount: number;
  customerCount: number;
  customers: Array<{
    customerCode: string;
    customerName: string;
    customerType: string;
    pincode: string;
    region: string;
  }>;
  usersByRole: Array<{
    role: string;
    userName?: string | null;
    status: "assigned" | "missing";
  }>;
  approvalChain: Array<{ role: string; userName?: string | null }>;
  warnings: string[];
}

export interface SplitMergeAssignableUserOption {
  id: string;
  fullName: string;
  roleName?: string | null;
  geographyLevel?: string | null;
  isCurrentAssignment?: boolean;
  /** Unassigned or on a selected source → true; mapped to another geography → false */
  isSelectable?: boolean;
  zoneId?: string | null;
  regionId?: string | null;
  areaId?: string | null;
  territoryId?: string | null;
}

const ROLE_TO_GEO_LEVEL: Record<string, string> = {
  ZSM: "Zone",
  RSM: "Region",
  ASM: "Area",
  TM: "Territory",
  TSM: "Territory",
  ZONE: "Zone",
  REGION: "Region",
  AREA: "Area",
  TERRITORY: "Territory",
};

function usersForRole(
  users: SplitMergeAssignableUserOption[],
  role: string,
): SplitMergeAssignableUserOption[] {
  const norm = role.trim().toUpperCase();
  const targetLevel = (ROLE_TO_GEO_LEVEL[norm] || norm).toUpperCase();

  // Any user whose role has the matching geography level (or whose role name contains the code/level)
  const matched = users.filter((u) => {
    const gLevel = (u.geographyLevel || "").trim().toUpperCase();
    const rName = (u.roleName || "").trim().toUpperCase();

    // 1. Geography level configured in Role Master matches the target geography level
    if (gLevel && gLevel === targetLevel) return true;

    // 2. Role name contains the role code (e.g. ZSM, RSM, ASM, TM) or level name (e.g. Zone, Region)
    if (rName && (rName.includes(norm) || rName.includes(targetLevel))) return true;

    return false;
  });

  return matched.length > 0 ? matched : users;
}

interface SplitMergeResultCardProps {
  preview: SplitMergeCardPreview;
  userAssignments: Record<string, RoleUserAssignment>;
  onUserAssignmentChange: (role: string, patch: Partial<RoleUserAssignment>) => void;
  assignableUsers?: SplitMergeAssignableUserOption[];
  mergeSourceNames?: string[];
  onUserCreated?: (newUser: { id: string; fullName: string; roleName?: string }) => void;
  assignedUserIdsByRole?: Record<string, Record<string, string>>; // [role -> [userId -> cardName]]
}

export function SplitMergeResultCard({
  preview,
  userAssignments,
  onUserAssignmentChange,
  assignableUsers = [],
  mergeSourceNames,
  onUserCreated,
  assignedUserIdsByRole = {},
}: SplitMergeResultCardProps) {
  const roleCandidates = useMemo(() => {
    const map: Record<string, SplitMergeAssignableUserOption[]> = {};
    for (const { role } of preview.usersByRole) {
      map[role] = usersForRole(assignableUsers, role);
    }
    return map;
  }, [preview.usersByRole, assignableUsers]);

  const [quickAddModal, setQuickAddModal] = useState<{
    open: boolean;
    roleCode: string;
  }>({ open: false, roleCode: "" });

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <QuickAddUserModal
        open={quickAddModal.open}
        onOpenChange={(open) => setQuickAddModal((prev) => ({ ...prev, open }))}
        roleCode={quickAddModal.roleCode}
        onUserCreated={(newUser) => {
          onUserCreated?.(newUser);
          if (quickAddModal.roleCode) {
            onUserAssignmentChange(quickAddModal.roleCode, {
              action: "assign",
              userId: newUser.id,
            });
          }
        }}
      />
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{preview.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {preview.isExisting ? "Existing Geography" : "New Geography"} · {preview.level} · Parent:{" "}
              {preview.parentName}
            </p>
          </div>
          {preview.warnings.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
              {preview.warnings.length} warning{preview.warnings.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Scopes and Coverage */}
        <div className="text-xs">
          <Metric
            label="Assigned Scope"
            value={
              preview.assignedScopeLabels.length > 0
                ? preview.assignedScopeLabels.join(", ")
                : "None assigned"
            }
          />
        </div>

        {mergeSourceNames && mergeSourceNames.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Old geographies will become inactive: {mergeSourceNames.join(", ")}.
            Only the user you assign here stays mapped to the merged geography;
            other users currently on those sources are unassigned automatically.
          </p>
        )}

        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Approval Chain
          </p>
          <ul className="text-xs space-y-1">
            {preview.approvalChain.map((link) => (
              <li key={link.role} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{link.role}</span>
                <span className={cn(!link.userName && "text-amber-700")}>
                  {link.userName ?? "Missing"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* User assignments */}
        <div className="space-y-3 pt-1 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
              <Users className="w-3.5 h-3.5 text-brand-600" />
              Assign / Update Users
            </span>
            <span className="text-[10px] text-muted-foreground">
              Required for approval chain
            </span>
          </div>

          {preview.usersByRole.map(({ role, userName }) => {
            const inherited = isInheritedSplitMergeRole(preview.level, role);
            const defaultAction = preview.isExisting ? ("keep" as const) : ("unassigned" as const);
            const rawAssignment = userAssignments[role];
            const assignment =
              !preview.isExisting && rawAssignment?.action === "keep"
                ? { action: "unassigned" as const, userId: "" }
                : rawAssignment ?? { action: defaultAction, userId: "" };
            const candidates = roleCandidates[role] ?? [];
            const inheritedUser =
              candidates.find((u) => {
                const gLevel = (
                  u.geographyLevel ||
                  ROLE_TO_GEO_LEVEL[role.trim().toUpperCase()] ||
                  ""
                ).toUpperCase();
                if (gLevel === "ZONE") return Boolean(u.zoneId);
                if (gLevel === "REGION") return Boolean(u.regionId);
                if (gLevel === "AREA") return Boolean(u.areaId);
                if (gLevel === "TERRITORY") return Boolean(u.territoryId);
                return false;
              }) || candidates[0];
            const currentAssigned = preview.isExisting
              ? candidates.find((u) => u.isCurrentAssignment) ||
                candidates.find((u) => preview.level === "Zone" && u.zoneId && u.zoneId === preview.key) ||
                candidates[0]
              : null;

            if (inherited) {
              const label =
                (inheritedUser
                  ? `${inheritedUser.fullName}${inheritedUser.roleName ? ` (${inheritedUser.roleName})` : ""}`
                  : null) ||
                (userName && userName !== "Keep existing" ? userName : null) ||
                `Parent ${role}`;

              return (
                <div
                  key={role}
                  className="rounded-lg border border-border p-3 space-y-2 bg-muted/10"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">{role} Role</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 bg-muted text-muted-foreground border border-border">
                      Inherited
                    </span>
                  </div>
                  <div className="h-8 px-2.5 rounded-md border border-border bg-muted/40 flex items-center justify-between text-xs text-muted-foreground cursor-not-allowed opacity-80">
                    <span className="truncate">{label}</span>
                    <span className="text-[10px] ml-1 shrink-0">(Parent)</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Parent {role} stays on the parent geography and cannot be changed here.
                  </p>
                </div>
              );
            }

            return (
              <div
                key={role}
                className="rounded-lg border border-border p-3 space-y-2 bg-muted/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">{role} Role</span>
                  <div className="flex items-center gap-1.5">
                    {assignment.action === "assign" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[10px] text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                        onClick={() => setQuickAddModal({ open: true, roleCode: role })}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Quick Add User
                      </Button>
                    )}
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0",
                        assignment.action === "keep" && "bg-blue-50 text-blue-700 border border-blue-200",
                        assignment.action === "assign" &&
                          (assignment.userId
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"),
                        assignment.action === "unassigned" &&
                          "bg-muted text-muted-foreground border border-border",
                      )}
                    >
                      {assignment.action === "keep"
                        ? "Keep"
                        : assignment.action === "assign"
                        ? assignment.userId
                          ? "Assigned"
                          : "Select User"
                        : "Unassigned"}
                    </span>
                  </div>
                </div>

                {assignment.action === "keep" ? (
                  <div className="h-8 px-2.5 rounded-md border border-border bg-muted/20 flex items-center justify-between text-xs">
                    <span className="truncate">
                      {currentAssigned
                        ? `${currentAssigned.fullName} ${currentAssigned.roleName ? `(${currentAssigned.roleName})` : ""}`
                        : preview.usersByRole.find((u) => u.role === role)?.userName &&
                          preview.usersByRole.find((u) => u.role === role)?.userName !== "Keep existing"
                        ? preview.usersByRole.find((u) => u.role === role)?.userName
                        : "Keep Existing"}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1 shrink-0">(Current)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 min-w-0">
                      <Select
                        value={assignment.userId || undefined}
                        disabled={assignment.action !== "assign"}
                        onValueChange={(v) =>
                          onUserAssignmentChange(role, { userId: v || "" })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue
                            placeholder={
                              assignment.action === "unassigned"
                                ? "Unassigned"
                                : `Select ${role} User...`
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {candidates.length === 0 ? (
                            <div className="px-2 py-3 text-xs text-center text-muted-foreground">
                              No assignable {role} users found
                            </div>
                          ) : (
                            candidates.map((u) => {
                              const assignedToCard = assignedUserIdsByRole[role]?.[u.id];
                              const takenByOtherCard = Boolean(
                                assignedToCard && assignedToCard !== preview.key,
                              );
                              // Backend marks selectable: unassigned OR on a selected source zone/region/area
                              // Mapped to a geography outside the merge/split sources → disabled
                              const mappedElsewhere = u.isSelectable === false;
                              const disabled = takenByOtherCard || mappedElsewhere;
                              const suffix = mappedElsewhere
                                ? " — assigned to another geography"
                                : takenByOtherCard
                                  ? " — used on another geography"
                                  : u.isCurrentAssignment
                                    ? " — from selected source"
                                    : " — available";
                              return (
                                <SelectItem
                                  key={u.id}
                                  value={u.id}
                                  disabled={disabled}
                                  className="text-xs"
                                >
                                  {u.fullName} {u.roleName ? `(${u.roleName})` : ""}
                                  {suffix}
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    {assignment.action === "assign" && candidates.length === 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs border-dashed border-brand-300 text-brand-600 hover:bg-brand-50 shrink-0"
                        onClick={() => setQuickAddModal({ open: true, roleCode: role })}
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1" />
                        Quick Add
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {(
                    (preview.isExisting
                      ? [
                          ["keep", "Keep Existing"],
                          ["assign", "Assign New User"],
                          ["unassigned", "Leave Unassigned"],
                        ]
                      : [
                          ["assign", "Assign New User"],
                          ["unassigned", "Leave Unassigned"],
                        ]) as ReadonlyArray<readonly ["keep" | "assign" | "unassigned", string]>
                  ).map(([action, label]) => (
                    <Button
                      key={action}
                      type="button"
                      variant={assignment.action === action ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-7 text-[10px]",
                        assignment.action === action && "bg-brand-600 hover:bg-brand-700 text-white",
                      )}
                      onClick={() => onUserAssignmentChange(role, { action })}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {preview.warnings.length > 0 && (
          <ul className="text-xs text-amber-800 space-y-1">
            {preview.warnings.map((w) => (
              <li key={w} className="flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {w}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/10 p-2.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold mt-0.5 line-clamp-2">{value}</p>
    </div>
  );
}
