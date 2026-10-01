"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { HR_BTN_CLASS, HR_BTN_PRIMARY_CLASS, HR_DRAWER_WIDTH_CLASS } from "./hr-org-form";
import { cn } from "@/lib/utils";

/** Right drawer — scrollable body, sticky footer. Default ~480px; pass contentClassName to widen. */
export function HrFormDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSave,
  saveLabel = "Save",
  saving,
  saveDisabled,
  contentClassName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSave: () => void;
  saveLabel?: string;
  saving?: boolean;
  saveDisabled?: boolean;
  /** Optional override for SheetContent width (e.g. Shift Setup weekly schedule). */
  contentClassName?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn(HR_DRAWER_WIDTH_CLASS, contentClassName)}>
        <SheetHeader className="px-5 pt-4 pb-3 pr-12">
          <SheetTitle className="text-[15px] font-semibold">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-xs mt-0.5">{description}</SheetDescription>
          )}
        </SheetHeader>
        <SheetBody className="px-5 py-5">{children}</SheetBody>
        <SheetFooter className="px-5 py-3 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={HR_BTN_CLASS}
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className={HR_BTN_PRIMARY_CLASS}
            onClick={onSave}
            disabled={saving || saveDisabled}
          >
            {saveLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
