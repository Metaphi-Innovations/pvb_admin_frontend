"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export type PackingListDownloadOption = {
  packingListId: string;
  packingNumber: string;
  generatedAt?: string;
  status?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: PackingListDownloadOption[];
  onDownload: (option: PackingListDownloadOption) => void | Promise<void>;
  title?: string;
};

export function PackingListDownloadDialog({
  open,
  onOpenChange,
  options,
  onDownload,
  title = "Download Packing List",
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Select a packing list to download. Each PDF shows only the quantity
            included in that packing list.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[360px] overflow-y-auto">
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No packing lists available.
            </p>
          ) : (
            options.map((opt) => (
              <div
                key={opt.packingListId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {opt.packingNumber || opt.packingListId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {opt.generatedAt ? `Date: ${opt.generatedAt}` : "Date: —"}
                    {opt.status ? ` · ${opt.status}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 shrink-0"
                  onClick={() => onDownload(opt)}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
