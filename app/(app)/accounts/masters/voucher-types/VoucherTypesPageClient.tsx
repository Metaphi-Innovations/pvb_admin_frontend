"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ActiveInactiveToggle } from "@/components/ui/ActiveInactiveToggle";
import { Lock } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { loadVoucherTypes, saveVoucherTypes, type VoucherTypeMaster } from "../masters-data";

export default function VoucherTypesPageClient() {
  const [records, setRecords] = useState(loadVoucherTypes());
  const [edit, setEdit] = useState<VoucherTypeMaster | null>(null);

  const save = () => {
    if (!edit) return;
    const list = records.map((r) => (r.id === edit.id ? { ...edit, isSystem: true } : r));
    saveVoucherTypes(list);
    setRecords(loadVoucherTypes());
    setEdit(null);
  };

  return (
    <>
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Masters", "Voucher Types")}
        title="Voucher Types"
        description="System voucher types — Journal, Payment, Receipt, Contra, Sales, Purchase, Debit Note and Credit Note. Configure prefix, numbering and status only."
        layout="split"
      >
        <div className="flex-1 overflow-auto min-h-0">
          <table className="accounts-table w-full">
            <thead className="border-b border-border/60">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Voucher Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prefix</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Numbering</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start No.</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {records.map((vt) => (
                <tr key={vt.id} className="accounts-table-row group">
                  <td className="px-4 py-3 text-sm font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {vt.name}
                      <Lock className="w-3 h-3 text-muted-foreground" aria-hidden />
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono">{vt.prefix}</td>
                  <td className="px-4 py-3 text-xs capitalize">{vt.numberingType}</td>
                  <td className="px-4 py-3 text-xs tabular-nums">{vt.startingNumber}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" className="h-7 text-sm" onClick={() => setEdit({ ...vt })}>
                      Configure
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AccountsPageShell>

      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <SheetContent className="sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle className="text-base">Configure {edit?.name}</SheetTitle>
          </SheetHeader>
          {edit && (
            <SheetBody className="space-y-4 py-4">
              <p className="text-xs text-muted-foreground">
                Voucher type name cannot be changed. System types cannot be deleted.
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Prefix</Label>
                <Input
                  className="h-9 text-sm font-medium font-mono"
                  value={edit.prefix}
                  onChange={(e) => setEdit({ ...edit, prefix: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Numbering</Label>
                <Select
                  value={edit.numberingType}
                  onValueChange={(v) => setEdit({ ...edit, numberingType: v as "auto" | "manual" })}
                >
                  <SelectTrigger className="h-9 text-sm font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto" className="text-xs">Auto</SelectItem>
                    <SelectItem value="manual" className="text-xs">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Starting Number</Label>
                <Input
                  className="h-9 text-sm font-medium"
                  type="number"
                  min={1}
                  value={edit.startingNumber}
                  onChange={(e) => setEdit({ ...edit, startingNumber: Number(e.target.value) || 1 })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
                <div>
                  <Label className="text-xs">Status</Label>
                  <p className="text-xs text-muted-foreground">
                    {edit.status === "active" ? "Active" : "Inactive"}
                  </p>
                </div>
                <ActiveInactiveToggle
                  active={edit.status === "active"}
                  onChange={(on) => setEdit({ ...edit, status: on ? "active" : "inactive" })}
                />
              </div>
            </SheetBody>
          )}
          <SheetFooter>
            <Button size="sm" className="h-9 text-sm font-medium bg-brand-600 text-white" onClick={save}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
