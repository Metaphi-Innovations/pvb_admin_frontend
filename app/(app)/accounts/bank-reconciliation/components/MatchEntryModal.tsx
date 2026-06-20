"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CategorizeEntryPanel } from "./CategorizeEntryPanel";
import type { BankStatementEntry } from "../bank-reconciliation-data";

export function MatchEntryModal({
  entries,
  open,
  onOpenChange,
  onUpdated,
}: {
  entries: BankStatementEntry[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[520px] p-0 flex flex-col">
        <CategorizeEntryPanel
          entries={entries}
          onUpdated={onUpdated}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
