"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Pagination } from "@/components/listing/Pagination";
import { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
import { Plus, MoreVertical, Eye, Pencil, History, Ban } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HrStatusBadge } from "../../components/HrStatusBadge";
import { STATE_OPTIONS } from "../sf-holiday-data";
import {
  loadSfDailyAttendance,
  saveSfDailyAttendance,
  syncAllAttendanceRules,
} from "../sf-attendance-data";
import {
  WEEKOFF_AUDIT,
  WEEK_OFF_APPLICABLE,
  WEEK_OFF_DAY_OPTIONS,
  WEEKOFF_TERRITORY_OPTIONS,
  loadSfWeekOffRules,
  saveSfWeekOffRules,
  stampWeekOffRule,
  type SfWeekOffRule,
  type WeekOffDayOption,
} from "../sf-weekoff-data";
import { getRoleDisplayName, getSalesForceRoleIds } from "../../sales-force-policy/tada-policy-data";

const EMPTY: Partial<SfWeekOffRule> = {
  ruleName: "",
  applicableTo: "All Sales Force",
  state: "",
  territory: "",
  role: "",
  weekOffDays: ["Sunday"],
  effectiveFrom: "",
  effectiveTo: "",
  status: "active",
  remarks: "",
};

export function WeekOffSetupSection({ onWeekOffsChange }: { onWeekOffsChange?: () => void }) {
  const [records, setRecords] = useState<SfWeekOffRule[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mode, setMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<SfWeekOffRule | null>(null);
  const [form, setForm] = useState<Partial<SfWeekOffRule>>(EMPTY);
  const [auditOpen, setAuditOpen] = useState(false);

  const refresh = useCallback(() => setRecords(loadSfWeekOffRules()), []);
  useEffect(() => { refresh(); }, [refresh]);

  const sfRoles = getSalesForceRoleIds();

  const visible = useMemo(() => {
    let r = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (w) =>
          w.ruleName.toLowerCase().includes(q) ||
          w.territory.toLowerCase().includes(q) ||
          w.state.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") r = r.filter((w) => w.status === statusFilter);
    return r.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [records, search, statusFilter]);

  const paginated = visible.slice((page - 1) * pageSize, page * pageSize);

  const openAdd = () => {
    setForm({ ...EMPTY });
    setActive(null);
    setMode("add");
  };

  const openEdit = (w: SfWeekOffRule) => {
    setActive(w);
    setForm({ ...w });
    setMode("edit");
  };

  const openView = (w: SfWeekOffRule) => {
    setActive(w);
    setForm({ ...w });
    setMode("view");
  };

  const persist = () => {
    const id = mode === "add" ? Math.max(0, ...records.map((w) => w.id)) + 1 : active!.id;
    const next = stampWeekOffRule(id, form, active ?? undefined);
    const list = mode === "add" ? [...records, next] : records.map((w) => (w.id === id ? next : w));
    saveSfWeekOffRules(list);
    const att = syncAllAttendanceRules(loadSfDailyAttendance());
    saveSfDailyAttendance(att);
    setRecords(list);
    setMode(null);
    onWeekOffsChange?.();
  };

  const deactivate = (w: SfWeekOffRule) => {
    const list = records.map((x) =>
      x.id === w.id ? { ...x, status: "inactive" as const, updatedAt: new Date().toISOString() } : x,
    );
    saveSfWeekOffRules(list);
    const att = syncAllAttendanceRules(loadSfDailyAttendance());
    saveSfDailyAttendance(att);
    setRecords(list);
    onWeekOffsChange?.();
  };

  const toggleWeekDay = (day: WeekOffDayOption, checked: boolean) => {
    setForm((f) => {
      const current = f.weekOffDays ?? [];
      const next = checked ? [...current, day] : current.filter((d) => d !== day);
      return { ...f, weekOffDays: next.length ? next : ["Sunday"] };
    });
  };

  const scopeLabel = (w: SfWeekOffRule) => {
    if (w.applicableTo === "Specific State") return w.state || "—";
    if (w.applicableTo === "Specific Territory") return w.territory || "—";
    if (w.applicableTo === "Specific Role") return w.role || "—";
    return "—";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-section-title text-navy-900">Week Off Setup</h2>
          <p className="text-helper text-muted-foreground">
            Configure week off rules — applicable dates are auto-marked on the attendance calendar (Holiday takes priority).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setAuditOpen(true)}>
            <History className="w-3.5 h-3.5" /> Audit
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" /> Add Rule
          </Button>
        </div>
      </div>

      <ModuleFiltersBar searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search rule name, territory…">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-[120px] text-xs bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Status</SelectItem>
            <SelectItem value="active" className="text-xs">Active</SelectItem>
            <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </ModuleFiltersBar>

      <div className="page-shell overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-table min-w-[1000px]">
            <thead className="sticky top-0 bg-white border-b">
              <tr>
                {["Rule Name", "Applicable To", "State / Territory / Role", "Week Off Days", "Effective From", "Effective To", "Status", "Updated By", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-12 text-center text-xs text-muted-foreground">No week off rules configured.</td></tr>
              ) : (
                paginated.map((w) => (
                  <tr key={w.id} className="border-b border-border/50 hover:bg-brand-50/30">
                    <td className="px-3 py-2 text-xs font-medium">{w.ruleName}</td>
                    <td className="px-3 py-2 text-xs">{w.applicableTo}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{scopeLabel(w)}</td>
                    <td className="px-3 py-2 text-xs">{w.weekOffDays.join(", ")}</td>
                    <td className="px-3 py-2 text-xs font-mono">{w.effectiveFrom || "—"}</td>
                    <td className="px-3 py-2 text-xs font-mono">{w.effectiveTo || "—"}</td>
                    <td className="px-3 py-2"><HrStatusBadge status={w.status} /></td>
                    <td className="px-3 py-2 text-xs">{w.updatedBy}</td>
                    <td className="px-3 py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted"><MoreVertical className="w-3.5 h-3.5" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="text-xs gap-2" onClick={() => openView(w)}><Eye className="w-3.5 h-3.5" /> View</DropdownMenuItem>
                          <DropdownMenuItem className="text-xs gap-2" onClick={() => openEdit(w)}><Pencil className="w-3.5 h-3.5" /> Edit</DropdownMenuItem>
                          {w.status === "active" && (
                            <DropdownMenuItem className="text-xs gap-2 text-red-600" onClick={() => deactivate(w)}><Ban className="w-3.5 h-3.5" /> Deactivate</DropdownMenuItem>
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
        <Pagination page={page} pageSize={pageSize} totalRecords={visible.length} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      </div>

      <Sheet open={!!mode} onOpenChange={(o) => !o && setMode(null)}>
        <SheetContent className="sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b">
            <SheetTitle className="text-sm">
              {mode === "add" ? "Add Week Off Rule" : mode === "edit" ? "Edit Week Off Rule" : "View Week Off Rule"}
            </SheetTitle>
          </SheetHeader>
          <SheetBody className="px-5 py-4 space-y-3 text-xs flex-1 overflow-y-auto">
            <Field label="Week Off Rule Name">
              <Input className="h-8 text-xs" disabled={mode === "view"} value={form.ruleName ?? ""} onChange={(e) => setForm((f) => ({ ...f, ruleName: e.target.value }))} />
            </Field>
            <Field label="Applicable To">
              <Select disabled={mode === "view"} value={form.applicableTo} onValueChange={(v) => setForm((f) => ({ ...f, applicableTo: v as SfWeekOffRule["applicableTo"] }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{WEEK_OFF_APPLICABLE.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {form.applicableTo === "Specific State" && (
              <Field label="State">
                <Select disabled={mode === "view"} value={form.state} onValueChange={(v) => setForm((f) => ({ ...f, state: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATE_OPTIONS.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            )}
            {form.applicableTo === "Specific Territory" && (
              <Field label="Territory">
                <Select disabled={mode === "view"} value={form.territory} onValueChange={(v) => setForm((f) => ({ ...f, territory: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{WEEKOFF_TERRITORY_OPTIONS.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            )}
            {form.applicableTo === "Specific Role" && (
              <Field label="Role">
                <Select disabled={mode === "view"} value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{sfRoles.map((id) => <SelectItem key={id} value={getRoleDisplayName(id)} className="text-xs">{getRoleDisplayName(id)}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Week Off Days">
              <div className="grid grid-cols-2 gap-2 pt-1">
                {WEEK_OFF_DAY_OPTIONS.map((day) => (
                  <label key={day} className="flex items-center gap-2 text-[11px]">
                    <Checkbox
                      disabled={mode === "view"}
                      checked={(form.weekOffDays ?? []).includes(day)}
                      onCheckedChange={(v) => toggleWeekDay(day, !!v)}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Effective From">
                <Input type="date" className="h-8 text-xs" disabled={mode === "view"} value={form.effectiveFrom ?? ""} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} />
              </Field>
              <Field label="Effective To">
                <Input type="date" className="h-8 text-xs" disabled={mode === "view"} value={form.effectiveTo ?? ""} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))} />
              </Field>
            </div>
            <Field label="Status">
              <Select disabled={mode === "view"} value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as "active" | "inactive" }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="text-xs">Active</SelectItem>
                  <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Remarks">
              <Textarea className="min-h-[60px] text-xs resize-none" disabled={mode === "view"} value={form.remarks ?? ""} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
            </Field>
          </SheetBody>
          {mode !== "view" && (
            <SheetFooter className="px-5 py-3 border-t flex-row gap-2 justify-end">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setMode(null)}>Cancel</Button>
              <Button size="sm" className="h-8 text-xs bg-brand-600 text-white" onClick={persist}>Save</Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-sm">Audit History</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
            {WEEKOFF_AUDIT.map((e, i) => (
              <div key={i} className="flex justify-between border-b py-1.5"><span>{e.action} · {e.entity}</span><span className="text-muted-foreground">{e.user}</span></div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      {children}
    </div>
  );
}
