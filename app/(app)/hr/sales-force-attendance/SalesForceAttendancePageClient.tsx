"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
import { Pagination } from "@/components/listing/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CalendarCheck, Download, MoreVertical, Eye, Pencil, History, Plus } from "lucide-react";
import { HrStatusBadge } from "../components/HrStatusBadge";
import { SfAttendanceDetailDrawer } from "./components/SfAttendanceDetailDrawer";
import { MarkAttendanceDrawer } from "./components/MarkAttendanceDrawer";
import { BulkMarkAttendanceDrawer } from "./components/BulkMarkAttendanceDrawer";
import { HolidaySetupSection } from "./components/HolidaySetupSection";
import { WeekOffSetupSection } from "./components/WeekOffSetupSection";
import {
  buildMonthlySummaries,
  bulkMarkSfAttendance,
  currentMonthKey,
  getSfEmployees,
  loadSfDailyAttendance,
  markSfAttendance,
  monthLabel,
  SF_ATTENDANCE_AUDIT,
  type SfMonthlySummary,
} from "./sf-attendance-data";

type AttTab = "summary" | "holidays" | "weekoffs";

export default function SalesForceAttendancePageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<AttTab>("summary");
  const [monthFilter, setMonthFilter] = useState(currentMonthKey());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [territoryFilter, setTerritoryFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailTarget, setDetailTarget] = useState<SfMonthlySummary | null>(null);
  const [markOpen, setMarkOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "holidays" || t === "summary" || t === "weekoffs") setActiveTab(t);
  }, [searchParams]);

  const goTab = (tab: AttTab) => {
    setActiveTab(tab);
    router.replace(`${pathname}?tab=${tab}`);
  };

  const refresh = useCallback(() => setTick((n) => n + 1), []);
  const summaries = useMemo(() => buildMonthlySummaries(monthFilter), [monthFilter, tick]);
  const employees = getSfEmployees();
  const roles = [...new Set(employees.map((e) => e.roleName))];
  const territories = [...new Set(employees.map((e) => e.territory))];
  const managers = [...new Set(employees.map((e) => e.reportingManager))];

  const visible = useMemo(() => {
    let r = [...summaries];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((s) => s.employeeName.toLowerCase().includes(q) || s.employeeCode.toLowerCase().includes(q));
    }
    if (roleFilter !== "all") r = r.filter((s) => s.role === roleFilter);
    if (territoryFilter !== "all") r = r.filter((s) => s.territory === territoryFilter);
    if (managerFilter !== "all") r = r.filter((s) => s.reportingManager === managerFilter);
    if (statusFilter !== "all") r = r.filter((s) => s.status === statusFilter);
    return r.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [summaries, search, roleFilter, territoryFilter, managerFilter, statusFilter]);

  const paginated = visible.slice((page - 1) * pageSize, page * pageSize);

  const handleMark = (
    employeeId: number,
    date: string,
    status: "present" | "absent",
    remarks: string,
    overrideHoliday: boolean,
    overrideWeekOff: boolean,
  ) => {
    try {
      markSfAttendance(employeeId, date, status, remarks, overrideHoliday, overrideWeekOff);
      refresh();
    } catch {
      /* holiday / week off conflict */
    }
  };

  const handleBulk = (opts: Parameters<typeof bulkMarkSfAttendance>[0]) => {
    bulkMarkSfAttendance(opts);
    refresh();
  };

  return (
    <AppLayout>
      <div className="max-w-[1600px] mx-auto space-y-3">
        <PageHeader
          title="Sales Force Attendance"
          description="Attendance for Sales Force roles only — Present, Absent, Holiday, and Week Off."
          icon={CalendarCheck}
          breadcrumbs={[
            { label: "HR", href: "/hr/sales-force-attendance" },
            { label: "Sales Force Attendance", href: "/hr/sales-force-attendance" },
            {
              label:
                activeTab === "summary"
                  ? "Attendance Summary"
                  : activeTab === "holidays"
                    ? "Holiday Setup"
                    : "Week Off Setup",
            },
          ]}
          actions={
            activeTab === "summary" ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setAuditOpen(true)}><History className="w-3.5 h-3.5" /> Audit</Button>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setBulkOpen(true)}>Bulk Mark</Button>
                <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1" onClick={() => setMarkOpen(true)}><Plus className="w-3.5 h-3.5" /> Mark Attendance</Button>
              </div>
            ) : undefined
          }
        />

        <div className="flex flex-wrap gap-1 border-b pb-1">
          {([
            ["summary", "Attendance Summary"],
            ["holidays", "Holiday Setup"],
            ["weekoffs", "Week Off Setup"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => goTab(id)}
              className={cn(
                "px-3 py-2 text-xs font-medium rounded-t-md border-b-2 -mb-px transition-colors",
                activeTab === id ? "border-brand-600 text-brand-700 bg-brand-50/50" : "border-transparent text-muted-foreground hover:bg-muted/40",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "summary" ? (
          <>
            <ModuleFiltersBar searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search employee, code…">
              <Input type="month" className="h-8 w-[140px] text-xs" value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }} />
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-[120px] text-xs bg-white"><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Roles</SelectItem>
                  {roles.map((r) => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={territoryFilter} onValueChange={(v) => { setTerritoryFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-[130px] text-xs bg-white"><SelectValue placeholder="Territory" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Territories</SelectItem>
                  {territories.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={managerFilter} onValueChange={(v) => { setManagerFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-[150px] text-xs bg-white"><SelectValue placeholder="Manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Managers</SelectItem>
                  {managers.map((m) => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-[120px] text-xs bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Status</SelectItem>
                  <SelectItem value="complete" className="text-xs">Complete</SelectItem>
                  <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                </SelectContent>
              </Select>
            </ModuleFiltersBar>

            <div className="page-shell overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-table min-w-[1100px]">
                  <thead className="sticky top-0 bg-white border-b">
                    <tr>
                      {["Employee Name", "Employee Code", "Role", "Reporting Manager", "Territory", "Month", "Present Days", "Absent Days", "Holiday Days", "Week Off Days", "Status", "Actions"].map((h) => (
                        <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr><td colSpan={12} className="px-3 py-12 text-center text-xs text-muted-foreground">No Sales Force attendance records for {monthLabel(monthFilter)}.</td></tr>
                    ) : (
                      paginated.map((s) => (
                        <tr key={s.employeeId} className="border-b border-border/50 hover:bg-brand-50/30">
                          <td className="px-2 py-2 text-xs font-medium">{s.employeeName}</td>
                          <td className="px-2 py-2 text-xs font-mono text-muted-foreground">{s.employeeCode}</td>
                          <td className="px-2 py-2 text-xs">{s.role}</td>
                          <td className="px-2 py-2 text-xs text-muted-foreground">{s.reportingManager}</td>
                          <td className="px-2 py-2 text-xs">{s.territory}</td>
                          <td className="px-2 py-2 text-xs">{monthLabel(s.month)}</td>
                          <td className="px-2 py-2 text-xs text-emerald-700 font-medium">{s.presentDays}</td>
                          <td className="px-2 py-2 text-xs text-red-600 font-medium">{s.absentDays}</td>
                          <td className="px-2 py-2 text-xs text-blue-700 font-medium">{s.holidayDays}</td>
                          <td className="px-2 py-2 text-xs text-stone-600 font-medium">{s.weekOffDays}</td>
                          <td className="px-2 py-2"><HrStatusBadge status={s.status} /></td>
                          <td className="px-2 py-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted"><MoreVertical className="w-3.5 h-3.5" /></button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem className="text-xs gap-2" onClick={() => setDetailTarget(s)}><Eye className="w-3.5 h-3.5" /> View Attendance</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2" onClick={() => setMarkOpen(true)}><Pencil className="w-3.5 h-3.5" /> Mark Attendance</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2" onClick={() => alert(`Download CSV for ${s.employeeName} — demo`)}><Download className="w-3.5 h-3.5" /> Download</DropdownMenuItem>
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
          </>
        ) : activeTab === "holidays" ? (
          <HolidaySetupSection onHolidaysChange={refresh} />
        ) : (
          <WeekOffSetupSection onWeekOffsChange={refresh} />
        )}
      </div>

      <SfAttendanceDetailDrawer open={!!detailTarget} summary={detailTarget} onClose={() => setDetailTarget(null)} />
      <MarkAttendanceDrawer open={markOpen} onClose={() => setMarkOpen(false)} onSave={handleMark} />
      <BulkMarkAttendanceDrawer open={bulkOpen} onClose={() => setBulkOpen(false)} onSave={handleBulk} />

      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-sm">Audit History</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
            {SF_ATTENDANCE_AUDIT.map((e, i) => (
              <div key={i} className="flex justify-between border-b py-1.5"><span>{e.action} · {e.entity}</span><span className="text-muted-foreground">{e.user}</span></div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
