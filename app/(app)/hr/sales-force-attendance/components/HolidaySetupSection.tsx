"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  APPLICABLE_TO_OPTIONS,
  HOLIDAY_AUDIT,
  HOLIDAY_TYPES,
  loadSfHolidays,
  saveSfHolidays,
  STATE_OPTIONS,
  stampHoliday,
  TERRITORY_OPTIONS,
  type ApplicableTo,
  type HolidayType,
  type SfHoliday,
} from "../sf-holiday-data";
import { loadSfDailyAttendance, saveSfDailyAttendance, syncAllAttendanceRules } from "../sf-attendance-data";
import { getRoleDisplayName, getSalesForceRoleIds } from "../../sales-force-policy/tada-policy-data";

const EMPTY: Partial<SfHoliday> = {
  holidayName: "",
  holidayDate: "",
  holidayType: "National Holiday",
  applicableTo: "All Sales Force",
  state: "",
  territory: "",
  role: "",
  status: "active",
  remarks: "",
};

export function HolidaySetupSection({ onHolidaysChange }: { onHolidaysChange?: () => void }) {
  const [records, setRecords] = useState<SfHoliday[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mode, setMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<SfHoliday | null>(null);
  const [form, setForm] = useState<Partial<SfHoliday>>(EMPTY);
  const [auditOpen, setAuditOpen] = useState(false);

  const refresh = useCallback(() => setRecords(loadSfHolidays()), []);
  useEffect(() => { refresh(); }, [refresh]);

  const sfRoles = getSalesForceRoleIds();

  const visible = useMemo(() => {
    let r = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((h) => h.holidayName.toLowerCase().includes(q) || h.holidayDate.includes(q));
    }
    if (typeFilter !== "all") r = r.filter((h) => h.holidayType === typeFilter);
    if (statusFilter !== "all") r = r.filter((h) => h.status === statusFilter);
    return r.sort((a, b) => b.holidayDate.localeCompare(a.holidayDate));
  }, [records, search, typeFilter, statusFilter]);

  const paginated = visible.slice((page - 1) * pageSize, page * pageSize);

  const openAdd = () => {
    setForm({ ...EMPTY });
    setActive(null);
    setMode("add");
  };

  const openEdit = (h: SfHoliday) => {
    setActive(h);
    setForm({ ...h });
    setMode("edit");
  };

  const openView = (h: SfHoliday) => {
    setActive(h);
    setForm({ ...h });
    setMode("view");
  };

  const persist = () => {
    const id = mode === "add" ? Math.max(0, ...records.map((h) => h.id)) + 1 : active!.id;
    const next = stampHoliday(id, form, active ?? undefined);
    const list = mode === "add" ? [...records, next] : records.map((h) => (h.id === id ? next : h));
    saveSfHolidays(list);
    const att = syncAllAttendanceRules(loadSfDailyAttendance());
    saveSfDailyAttendance(att);
    setRecords(list);
    setMode(null);
    onHolidaysChange?.();
  };

  const deactivate = (h: SfHoliday) => {
    const list = records.map((x) => (x.id === h.id ? { ...x, status: "inactive" as const, updatedAt: new Date().toISOString() } : x));
    saveSfHolidays(list);
    const att = syncAllAttendanceRules(loadSfDailyAttendance());
    saveSfDailyAttendance(att);
    setRecords(list);
    onHolidaysChange?.();
  };

  const locLabel = (h: SfHoliday) => {
    if (h.applicableTo === "Specific State") return h.state || "—";
    if (h.applicableTo === "Specific Territory") return h.territory || "—";
    if (h.applicableTo === "Specific Role") return h.role || "—";
    return "—";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-section-title text-navy-900">Holiday Setup</h2>
          <p className="text-helper text-muted-foreground">Configured holidays auto-mark attendance calendar for applicable Sales Force employees.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setAuditOpen(true)}><History className="w-3.5 h-3.5" /> Audit</Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Holiday</Button>
        </div>
      </div>

      <ModuleFiltersBar searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search holiday name, date…">
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-[150px] text-xs bg-white"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Types</SelectItem>
            {HOLIDAY_TYPES.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
          </SelectContent>
        </Select>
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
          <table className="w-full text-table min-w-[900px]">
            <thead className="sticky top-0 bg-white border-b">
              <tr>
                {["Holiday Name", "Holiday Date", "Holiday Type", "Applicable To", "State / Territory", "Status", "Updated By", "Updated On", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-12 text-center text-xs text-muted-foreground">No holidays configured.</td></tr>
              ) : (
                paginated.map((h) => (
                  <tr key={h.id} className="border-b border-border/50 hover:bg-brand-50/30">
                    <td className="px-3 py-2 text-xs font-medium">{h.holidayName}</td>
                    <td className="px-3 py-2 text-xs font-mono">{h.holidayDate}</td>
                    <td className="px-3 py-2 text-xs">{h.holidayType}</td>
                    <td className="px-3 py-2 text-xs">{h.applicableTo}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{locLabel(h)}</td>
                    <td className="px-3 py-2"><HrStatusBadge status={h.status} /></td>
                    <td className="px-3 py-2 text-xs">{h.updatedBy}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{h.updatedAt.slice(0, 10)}</td>
                    <td className="px-3 py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted"><MoreVertical className="w-3.5 h-3.5" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="text-xs gap-2" onClick={() => openView(h)}><Eye className="w-3.5 h-3.5" /> View</DropdownMenuItem>
                          <DropdownMenuItem className="text-xs gap-2" onClick={() => openEdit(h)}><Pencil className="w-3.5 h-3.5" /> Edit</DropdownMenuItem>
                          {h.status === "active" && (
                            <DropdownMenuItem className="text-xs gap-2 text-red-600" onClick={() => deactivate(h)}><Ban className="w-3.5 h-3.5" /> Deactivate</DropdownMenuItem>
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
            <SheetTitle className="text-sm">{mode === "add" ? "Add Holiday" : mode === "edit" ? "Edit Holiday" : "View Holiday"}</SheetTitle>
          </SheetHeader>
          <SheetBody className="px-5 py-4 space-y-3 text-xs flex-1 overflow-y-auto">
            <Field label="Holiday Name"><Input className="h-8 text-xs" disabled={mode === "view"} value={form.holidayName ?? ""} onChange={(e) => setForm((f) => ({ ...f, holidayName: e.target.value }))} /></Field>
            <Field label="Holiday Date"><Input type="date" className="h-8 text-xs" disabled={mode === "view"} value={form.holidayDate ?? ""} onChange={(e) => setForm((f) => ({ ...f, holidayDate: e.target.value }))} /></Field>
            <Field label="Holiday Type">
              <Select disabled={mode === "view"} value={form.holidayType} onValueChange={(v) => setForm((f) => ({ ...f, holidayType: v as HolidayType }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{HOLIDAY_TYPES.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Applicable To">
              <Select disabled={mode === "view"} value={form.applicableTo} onValueChange={(v) => setForm((f) => ({ ...f, applicableTo: v as ApplicableTo }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{APPLICABLE_TO_OPTIONS.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
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
                  <SelectContent>{TERRITORY_OPTIONS.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
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
            <Field label="Remarks"><Textarea className="min-h-[60px] text-xs resize-none" disabled={mode === "view"} value={form.remarks ?? ""} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} /></Field>
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
            {HOLIDAY_AUDIT.map((e, i) => (
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
