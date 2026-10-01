"use client";

import React from "react";
import { Edit2, Trash2, Eye } from "lucide-react";
import { HrIconActionButton } from "./HrIconActionButton";

/**
 * Row actions for HR Settings masters — always-visible icon buttons with tooltips.
 * Activate/Deactivate removed — use HrActiveStatusSwitch in the Status column.
 */
export function HrRowActions({
  onEdit,
  onView,
  onDelete,
  editLabel = "Edit",
  viewLabel = "View",
  deleteLabel = "Delete",
}: {
  onEdit: () => void;
  onView?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  viewLabel?: string;
  deleteLabel?: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      {onView ? (
        <HrIconActionButton label={viewLabel} onClick={onView}>
          <Eye />
        </HrIconActionButton>
      ) : null}
      <HrIconActionButton label={editLabel} onClick={onEdit}>
        <Edit2 />
      </HrIconActionButton>
      {onDelete ? (
        <HrIconActionButton label={deleteLabel} onClick={onDelete} destructive>
          <Trash2 />
        </HrIconActionButton>
      ) : null}
    </div>
  );
}
