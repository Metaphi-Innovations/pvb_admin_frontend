"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import {
  type GeoNode,
  getGeoDeletePreview,
  deleteGeoNode,
  saveGeoNodes,
} from "../geo-data";

interface GeographyDeleteDialogProps {
  node: GeoNode | null;
  nodes: GeoNode[];
  open: boolean;
  onClose: () => void;
  onDeleted: (deactivatedCount: number) => void;
}

export function GeographyDeleteDialog({
  node,
  nodes,
  open,
  onClose,
  onDeleted,
}: GeographyDeleteDialogProps) {
  if (!node) return null;

  const preview = getGeoDeletePreview(node.id, nodes);

  const handleConfirm = () => {
    const result = deleteGeoNode(node.id, nodes);
    if (!result.ok) return;
    saveGeoNodes(result.nodes);
    onDeleted(result.deactivatedCount);
    onClose();
  };

  const description = !preview.canDelete
    ? preview.reason
    : preview.descendantCount > 0
      ? `This geography has child records. Deleting it will also deactivate/hide ${preview.descendantCount} child record${preview.descendantCount > 1 ? "s" : ""}. "${node.name}" will be moved to the Inactive tab.`
      : `"${node.name}" will be deactivated and hidden from the Active tab. You can find it under the Inactive tab.`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-50 border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            Delete {node.level}?
          </DialogTitle>
          <DialogDescription className="pt-1 text-xs">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          {preview.canDelete && (
            <Button
              size="sm"
              className={cn("h-8 text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white")}
              onClick={handleConfirm}
            >
              Delete
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
