"use client";

import React from "react";
import { Building2 } from "lucide-react";
import { MasterRecordDrawer, masterAuditFromRecord } from "@/components/masters/MasterRecordDrawer";
import type { Department } from "../department-data";

interface DepartmentDetailSheetProps {
  open: boolean;
  onClose: () => void;
  dept?: Department | null;
  onEdit: (dept: Department) => void;
}

export default function DepartmentDetailSheet({
  open,
  onClose,
  dept,
  onEdit,
}: DepartmentDetailSheetProps) {
  if (!dept) return null;

  return (
    <MasterRecordDrawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      onClose={onClose}
      onEdit={() => onEdit(dept)}
      title="Department"
      icon={Building2}
      status={dept.status}
      basicInfo={[{ label: "Department Name", value: dept.name }]}
      description={dept.remarks}
      showDescription
      auditInfo={masterAuditFromRecord({
        createdBy: dept.createdBy,
        createdDate: dept.createdDate,
        updatedBy: dept.updatedBy,
        updatedDate: dept.updatedDate,
      })}
    />
  );
}
