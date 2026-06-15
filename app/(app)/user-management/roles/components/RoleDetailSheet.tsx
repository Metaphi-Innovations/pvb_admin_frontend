"use client";

import React from "react";
import { Shield } from "lucide-react";
import {
  MasterRecordDrawer,
  MasterDrawerSection,
  masterAuditFromRecord,
} from "@/components/masters/MasterRecordDrawer";
import { type Role } from "../roles-data";

interface RoleDetailSheetProps {
  open: boolean;
  onClose: () => void;
  role?: Role | null;
  onEdit: (role: Role) => void;
}

export default function RoleDetailSheet({ open, onClose, role, onEdit }: RoleDetailSheetProps) {
  if (!role) return null;

  const geoLabel =
    role.geoLevel === "None" ? "None — office role" : role.geoLevel;

  return (
    <MasterRecordDrawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      onClose={onClose}
      onEdit={() => onEdit(role)}
      title="Role"
      icon={Shield}
      recordCode={role.roleName}
      status={role.status}
      basicInfo={[{ label: "Department", value: role.department }]}
      description={role.description}
      showDescription
      auditInfo={masterAuditFromRecord({
        createdBy: role.createdBy,
        createdDate: role.createdDate,
        updatedBy: role.updatedBy,
        updatedDate: role.updatedDate,
      })}
    >
      <MasterDrawerSection title="Geography">
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground">Geo Level</p>
          <p className="text-sm font-medium text-foreground leading-snug">{geoLabel}</p>
        </div>
      </MasterDrawerSection>
    </MasterRecordDrawer>
  );
}
