"use client";

import React from "react";
import { HrConfirmDialog } from "./HrConfirmDialog";

export const HR_SETTINGS_DELETE_BLOCKED =
  "This record is already in use and cannot be deleted. You can make it inactive instead.";

export const HR_SETTINGS_DELETE_BLOCKED_INACTIVE =
  "This record is already in use and cannot be deleted.";

export const HR_SETTINGS_DELETE_UNDO_WARNING = "This action cannot be undone.";

/** Target for safe HR Settings delete — check usage before hard-delete. */
export interface HrSettingsDeleteTarget {
  entityLabel: string;
  usageCount: number;
  /** When false, blocked dialog shows Close only (already inactive). */
  isActive?: boolean;
}

export function HrSettingsDeleteDialog({
  open,
  onClose,
  target,
  onDelete,
  onMakeInactive,
}: {
  open: boolean;
  onClose: () => void;
  target: HrSettingsDeleteTarget | null;
  onDelete: () => void;
  onMakeInactive?: () => void;
}) {
  if (!target) return null;

  const inUse = target.usageCount > 0;
  const canMakeInactive = inUse && target.isActive !== false && !!onMakeInactive;

  if (inUse) {
    return (
      <HrConfirmDialog
        open={open}
        onClose={onClose}
        onConfirm={() => {
          if (canMakeInactive) onMakeInactive();
        }}
        title="Cannot delete record"
        description={
          canMakeInactive ? HR_SETTINGS_DELETE_BLOCKED : HR_SETTINGS_DELETE_BLOCKED_INACTIVE
        }
        confirmLabel={canMakeInactive ? "Make Inactive" : "Close"}
        destructive={false}
      />
    );
  }

  return (
    <HrConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onDelete}
      title={`Delete this ${target.entityLabel}?`}
      description={HR_SETTINGS_DELETE_UNDO_WARNING}
      confirmLabel="Delete"
      destructive
    />
  );
}
