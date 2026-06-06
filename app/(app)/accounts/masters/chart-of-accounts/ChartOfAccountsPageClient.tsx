"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ActiveInactiveToggle } from "@/components/ui/ActiveInactiveToggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { BookOpen, Eye, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortTh, StatusBadge } from "../../components/AccountsUI";
import { nextId } from "../../data";
import {
  ACCOUNT_TYPE_OPTIONS,
  DEFAULT_COA_FORM,
  ERP_USAGE_OPTIONS,
  canDeleteCoa,
  formToRecord,
  formatUsedIn,
  generateAccountCode,
  getParentAccountOptions,
  loadChartOfAccounts,
  recordToForm,
  saveChartOfAccounts,
  validateCoaForm,
  type AccountType,
  type ChartOfAccount,
  type ChartOfAccountFormValues,
  type ErpUsageModule,
} from "./chart-of-accounts-data";

type SheetMode = "add" | "edit" | "view" | null;

function AccountTypePill({ type }: { type: AccountType }) {
  const tones: Record<AccountType, string> = {
    Asset: "bg-emerald-50 text-emerald-800 border-emerald-200",
    Liability: "bg-red-50 text-red-800 border-red-200",
    Income: "bg-sky-50 text-sky-800 border-sky-200",
    Expense: "bg-amber-50 text-amber-900 border-amber-200",
    Equity: "bg-violet-50 text-violet-800 border-violet-200",
  };
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border", tones[type])}>
      {type}
    </span>
  );
}

export default function ChartOfAccountsPageClient() {
  const [records, setRecords] = useState<ChartOfAccount[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("accountCode");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [active, setActive] = useState<ChartOfAccount | null>(null);
  const [form, setForm] = useState<ChartOfAccountFormValues>(DEFAULT_COA_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChartOfAccount | null>(null);
  const [previewCode, setPreviewCode] = useState("");

  const refresh = useCallback(() => setRecords(loadChartOfAccounts()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const visible = useMemo(() => {
    let r = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (x) =>
          x.accountCode.toLowerCase().includes(q) ||
          x.accountName.toLowerCase().includes(q),
      );
    }
    if (typeFilter !== "all") r = r.filter((x) => x.accountType === typeFilter);
    if (statusFilter !== "all") r = r.filter((x) => x.status === statusFilter);
    r.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av ?? "").localeCompare(String(bv ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [records, search, typeFilter, statusFilter, sortKey, sortDir]);

  const parentOptions = useMemo(
    () => getParentAccountOptions(records, form.accountType, active?.id),
    [records, form.accountType, active?.id],
  );

  const openAdd = () => {
    const f = { ...DEFAULT_COA_FORM };
    setForm(f);
    setPreviewCode(generateAccountCode(f.accountType, records));
    setActive(null);
    setFormError(null);
    setSheetMode("add");
  };

  const openEdit = (row: ChartOfAccount) => {
    setActive(row);
    setForm(recordToForm(row));
    setPreviewCode(row.accountCode);
    setFormError(null);
    setSheetMode("edit");
  };

  const openView = (row: ChartOfAccount) => {
    setActive(row);
    setForm(recordToForm(row));
    setPreviewCode(row.accountCode);
    setSheetMode("view");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setFormError(null);
  };

  const toggleUsedIn = (value: ErpUsageModule, checked: boolean) => {
    setForm((f) => ({
      ...f,
      usedIn: checked ? [...f.usedIn, value] : f.usedIn.filter((m) => m !== value),
    }));
  };

  const handleSave = () => {
    const err = validateCoaForm(form, records, active?.id);
    if (err) {
      setFormError(err);
      return;
    }
    const list = [...records];
    if (sheetMode === "add") {
      const code = generateAccountCode(form.accountType, list);
      const row = formToRecord(form, nextId(list), code, list);
      list.push(row);
    } else if (sheetMode === "edit" && active) {
      const idx = list.findIndex((r) => r.id === active.id);
      if (idx >= 0) {
        list[idx] = formToRecord(form, active.id, active.accountCode, list, active);
        list.forEach((r, i) => {
          if (r.parentAccountId === active.id) {
            list[i] = { ...r, parentAccount: form.accountName.trim() };
          }
        });
      }
    }
    saveChartOfAccounts(list);
    setRecords(list);
    closeSheet();
  };

  const confirmDelete = () => {
    if (!deleteTarget || !canDeleteCoa(deleteTarget, records)) return;
    const list = records.filter((r) => r.id !== deleteTarget.id);
    saveChartOfAccounts(list);
    setRecords(list);
    setDeleteTarget(null);
  };

  const readOnly = sheetMode === "view";
  const isSystem = active?.isSystem ?? false;

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-3">
        <PageHeader
          title="Chart of Accounts"
          description="Lightweight account heads for ERP transaction mapping and financial reports."
          icon={BookOpen}
          breadcrumbs={[
            { label: "Accounts", href: "/accounts" },
            { label: "Masters", href: "/accounts/masters/chart-of-accounts" },
            { label: "Chart of Accounts" },
          ]}
          actions={
            <Button
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
              onClick={openAdd}
            >
              <Plus className="w-3.5 h-3.5" /> Create Account
            </Button>
          }
        />

        <ModuleFiltersBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search account code or name…"
        >
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs bg-white">
              <SelectValue placeholder="Account Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Types
              </SelectItem>
              {ACCOUNT_TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[120px] text-xs bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Status
              </SelectItem>
              <SelectItem value="active" className="text-xs">
                Active
              </SelectItem>
              <SelectItem value="inactive" className="text-xs">
                Inactive
              </SelectItem>
            </SelectContent>
          </Select>
        </ModuleFiltersBar>

        <div className="page-shell overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
            <table className="w-full text-table">
              <thead className="sticky top-0 z-10 bg-white border-b border-border">
                <tr>
                  <SortTh label="Account Code" colKey="accountCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Account Name" colKey="accountName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Account Type
                  </th>
                  <SortTh label="Parent Account" colKey="parentAccount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <SortTh label="Created By" colKey="createdBy" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Updated By" colKey="updatedBy" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-3 py-2.5 w-12" />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center text-xs text-muted-foreground">
                      No accounts match your filters.
                    </td>
                  </tr>
                ) : (
                  visible.map((r) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-b border-border/50 hover:bg-brand-50/30",
                        r.isSystem && "bg-muted/15",
                      )}
                    >
                      <td className="px-3 py-2.5 text-xs font-mono font-semibold text-brand-900">
                        {r.accountCode}
                        {r.isSystem && (
                          <span className="ml-1.5 text-[9px] font-normal text-muted-foreground uppercase">
                            System
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium">
                        {r.parentAccountId ? (
                          <span className="text-muted-foreground mr-1">└</span>
                        ) : null}
                        {r.accountName}
                      </td>
                      <td className="px-3 py-2.5">
                        <AccountTypePill type={r.accountType} />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {r.parentAccount || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.createdBy}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.updatedBy}</td>
                      <td className="px-3 py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem className="text-xs gap-2" onClick={() => openView(r)}>
                              <Eye className="w-3.5 h-3.5" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs gap-2" onClick={() => openEdit(r)}>
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </DropdownMenuItem>
                            {!r.isSystem && canDeleteCoa(r, records) && (
                              <DropdownMenuItem
                                className="text-xs gap-2 text-red-600"
                                onClick={() => setDeleteTarget(r)}
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Sheet open={!!sheetMode} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent className="w-full sm:max-w-[480px] flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-base">
              {sheetMode === "add"
                ? "Create Account"
                : sheetMode === "edit"
                  ? "Edit Account"
                  : "View Account"}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {isSystem
                ? "System group account — code and type cannot be changed."
                : "Map account heads to Procurement, Sales, TA/DA, Payments, and Journal."}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="flex-1 overflow-y-auto space-y-4 py-2">
            {formError && <p className="text-xs text-red-600">{formError}</p>}

            <div className="space-y-1">
              <Label className="text-[11px]">Account Code</Label>
              <Input
                className="h-8 text-xs font-mono bg-muted/30"
                value={previewCode}
                disabled
                readOnly
              />
              <p className="text-[10px] text-muted-foreground">Auto-generated on save</p>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">
                Account Name <span className="text-red-500">*</span>
              </Label>
              <Input
                className="h-8 text-xs"
                disabled={readOnly}
                value={form.accountName}
                onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
                placeholder="e.g. Travel Expense"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Account Type</Label>
              <Select
                value={form.accountType}
                disabled={readOnly || isSystem}
                onValueChange={(v) => {
                  const accountType = v as AccountType;
                  setForm((f) => ({
                    ...f,
                    accountType,
                    parentAccountId: null,
                  }));
                  if (sheetMode === "add") {
                    setPreviewCode(generateAccountCode(accountType, records));
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Parent Account (optional)</Label>
              <Select
                value={form.parentAccountId ? String(form.parentAccountId) : "none"}
                disabled={readOnly || isSystem}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    parentAccountId: v === "none" ? null : Number(v),
                  }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">
                    None (top level)
                  </SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                      {p.accountName} ({p.accountCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Description (optional)</Label>
              <Textarea
                className="text-xs min-h-[72px] resize-none"
                disabled={readOnly}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
              <div>
                <Label className="text-[11px]">Status</Label>
                <p className="text-[10px] text-muted-foreground">
                  {form.status === "active" ? "Active" : "Inactive"}
                </p>
              </div>
              <ActiveInactiveToggle
                active={form.status === "active"}
                onChange={(on) =>
                  setForm((f) => ({ ...f, status: on ? "active" : "inactive" }))
                }
                disabled={readOnly}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px]">Used In (ERP modules)</Label>
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-border/60 p-3 bg-muted/10">
                {ERP_USAGE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <Checkbox
                      checked={form.usedIn.includes(opt.value)}
                      disabled={readOnly}
                      onCheckedChange={(c) => toggleUsedIn(opt.value, !!c)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {readOnly && active && (
              <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 space-y-1.5 text-[11px]">
                <p>
                  <span className="text-muted-foreground">Used in:</span>{" "}
                  {formatUsedIn(active.usedIn)}
                </p>
                <p>
                  <span className="text-muted-foreground">Created by:</span> {active.createdBy}
                </p>
                <p>
                  <span className="text-muted-foreground">Updated by:</span> {active.updatedBy}
                </p>
              </div>
            )}
          </SheetBody>
          <SheetFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={closeSheet}>
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button
                size="sm"
                className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                onClick={handleSave}
              >
                Save
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Delete account?</DialogTitle>
            <DialogDescription className="text-xs">
              {deleteTarget?.accountName} ({deleteTarget?.accountCode}) will be removed. Child
              accounts must be deleted first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
