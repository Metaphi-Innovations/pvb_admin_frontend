"use client";

import React from "react";
import { FolderPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoaNodeHoverActionsProps {
  showAddSubGroup?: boolean;
  showAddLedger?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  onAddSubGroup?: () => void;
  onAddLedger?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  compact?: boolean;
}

/** Contextual COA row actions — separate Add Sub-Group and Add Ledger controls. */
export function CoaNodeHoverActions({
  showAddSubGroup = false,
  showAddLedger = false,
  showEdit = false,
  showDelete = false,
  onAddSubGroup,
  onAddLedger,
  onEdit,
  onDelete,
  className,
  compact = false,
}: CoaNodeHoverActionsProps) {
  const btnClass = cn(
    "flex items-center justify-center flex-shrink-0 rounded-md transition-colors",
    compact ? "w-5 h-5" : "w-6 h-6",
    "text-muted-foreground hover:text-foreground hover:bg-muted/60",
  );

  if (!showAddSubGroup && !showAddLedger && !showEdit && !showDelete) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {showAddSubGroup && onAddSubGroup && (
        <button
          type="button"
          className={cn(btnClass, "hover:text-brand-700 hover:bg-brand-50")}
          title="Add Sub-Group"
          aria-label="Add Sub-Group"
          onClick={onAddSubGroup}
        >
          <FolderPlus className={cn(compact ? "w-3.5 h-3.5" : "w-4 h-4")} strokeWidth={2} />
        </button>
      )}
      {showAddLedger && onAddLedger && (
        <button
          type="button"
          className={cn(btnClass, "hover:text-brand-700 hover:bg-brand-50")}
          title="Add Ledger"
          aria-label="Add Ledger"
          onClick={onAddLedger}
        >
          <Plus className={cn(compact ? "w-3.5 h-3.5" : "w-4 h-4")} strokeWidth={2} />
        </button>
      )}
      {showEdit && onEdit && (
        <button
          type="button"
          className={btnClass}
          title="Edit sub-group"
          aria-label="Edit sub-group"
          onClick={onEdit}
        >
          <Pencil className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} strokeWidth={2} />
        </button>
      )}
      {showDelete && onDelete && (
        <button
          type="button"
          className={cn(btnClass, "hover:text-red-600 hover:bg-red-50")}
          title="Delete sub-group"
          aria-label="Delete sub-group"
          onClick={onDelete}
        >
          <Trash2 className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
