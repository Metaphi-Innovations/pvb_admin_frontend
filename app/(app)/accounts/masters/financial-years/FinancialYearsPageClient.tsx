"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge } from "../../components/AccountsUI";
import {
  loadFinancialYears,
  nextMasterId,
  saveFinancialYears,
  setActiveFinancialYear,
  type FinancialYear,
} from "../masters-data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";

export default function FinancialYearsPageClient() {
  const [records, setRecords] = useState<FinancialYear[]>(loadFinancialYears());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "", lockDate: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const saveNew = () => {
    if (!form.name.trim()) {
      setFormError("Financial year name is required.");
      return;
    }
    if (!form.startDate || !form.endDate) {
      setFormError("Start and end dates are required.");
      return;
    }
    if (form.startDate >= form.endDate) {
      setFormError("End date must be after start date.");
      return;
    }
    const list = [...records];
    list.push({
      id: nextMasterId(list),
      name: form.name.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      lockDate: form.lockDate,
      status: "inactive",
      createdBy: ACCOUNTS_CURRENT_USER,
      updatedBy: ACCOUNTS_CURRENT_USER,
    });
    saveFinancialYears(list);
    setRecords(list);
    setOpen(false);
    setForm({ name: "", startDate: "", endDate: "", lockDate: "" });
    setFormError(null);
  };

  const activate = (id: number) => {
    setActiveFinancialYear(id);
    setRecords(loadFinancialYears());
  };

  return (
    <>
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Masters", "Financial Years")}
        title="Financial Years"
        description="Define accounting periods with start, end and lock dates. Only one financial year can be active."
        actions={
          <Button size="sm" className="h-9 text-[13px] font-medium bg-brand-600 text-white gap-1" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> Add Financial Year
          </Button>
        }
        layout="split"
      >
        <div className="flex-1 overflow-auto min-h-0">
          <table className="accounts-table w-full">
            <thead className="border-b border-border/60">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">FY Name</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Start Date</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">End Date</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Lock Date</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Active Status</th>
                <th className="w-28" />
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <p className="text-sm font-medium text-foreground">No financial years defined</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add a financial year to begin voucher entry and reporting.
                    </p>
                    <Button size="sm" className="h-9 text-[13px] font-medium mt-3 bg-brand-600 text-white gap-1" onClick={() => setOpen(true)}>
                      <Plus className="w-4 h-4" /> Add Financial Year
                    </Button>
                  </td>
                </tr>
              ) : (
                records.map((fy) => (
                  <tr key={fy.id} className="accounts-table-row group">
                    <td className="px-4 py-3 text-sm font-medium">{fy.name}</td>
                    <td className="px-4 py-3 text-xs">{fy.startDate}</td>
                    <td className="px-4 py-3 text-xs">{fy.endDate}</td>
                    <td className="px-4 py-3 text-xs">{fy.lockDate || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={fy.status === "active" ? "active" : "inactive"} />
                    </td>
                    <td className="px-4 py-3">
                      {fy.status !== "active" && (
                        <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => activate(fy.id)}>
                          Set Active
                        </Button>
                      )}
                      {fy.status === "active" && (
                        <span className="text-[11px] font-medium text-brand-700">Current FY</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AccountsPageShell>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle className="text-base">Add Financial Year</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-3 py-4">
            {formError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{formError}</p>
            )}
            <div className="space-y-1">
              <Label className="text-[11px]">FY Name</Label>
              <Input className="h-9 text-[13px] font-medium" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="FY 2026-27" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Start Date</Label>
              <Input className="h-9 text-[13px] font-medium" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">End Date</Label>
              <Input className="h-9 text-[13px] font-medium" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Lock Date</Label>
              <Input className="h-9 text-[13px] font-medium" type="date" value={form.lockDate} onChange={(e) => setForm((f) => ({ ...f, lockDate: e.target.value }))} />
            </div>
          </SheetBody>
          <SheetFooter>
            <Button size="sm" className="h-9 text-[13px] font-medium bg-brand-600 text-white" onClick={saveNew}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
