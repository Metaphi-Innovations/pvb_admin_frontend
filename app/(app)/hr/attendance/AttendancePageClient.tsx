"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarCheck, ChevronDown, ChevronsUpDown } from "lucide-react";
import { DEPARTMENT_OPTIONS } from "@/lib/hr/config";
import {
  buildEmployeeSummaries,
  currentMonthKey,
  loadDailyRecords,
  monthLabel,
  type EmployeeAttendanceSummary,
} from "./attendance-data";

function SortTh({
  label,
  colKey,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  colKey: string;
  sortKey: string;
  sortDir: string;
  onSort: (k: string) => void;
}) {
  const active = sortKey === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className={cn(
        "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer whitespace-nowrap",
        active && "text-brand-700",
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          <ChevronDown className={cn("w-3 h-3", sortDir === "desc" && "rotate-180")} />
        ) : (
          <ChevronsUpDown className="w-3 h-3 opacity-40" />
        )}
      </span>
    </th>
  );
}

export default function AttendancePageClient() {
  const router = useRouter();
  const [records, setRecords] = useState(loadDailyRecords);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(currentMonthKey());
  const [sortKey, setSortKey] = useState("employeeName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const refresh = useCallback(() => setRecords(loadDailyRecords()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const monthOptions = useMemo(() => {
    const months = Array.from(new Set(records.map((r) => r.date.slice(0, 7)))).sort(
      (a, b) => b.localeCompare(a),
    );
    return months.length ? months : [currentMonthKey()];
  }, [records]);

  const summaries = useMemo(
    () => buildEmployeeSummaries(records, monthFilter),
    [records, monthFilter],
  );

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const visible = useMemo(() => {
    let r: EmployeeAttendanceSummary[] = [...summaries];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (x) =>
          x.employeeName.toLowerCase().includes(q) ||
          x.employeeCode.toLowerCase().includes(q),
      );
    }
    if (deptFilter !== "all") {
      r = r.filter((x) => x.department === deptFilter);
    }
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
  }, [summaries, search, deptFilter, sortKey, sortDir]);

  return (
    <AppLayout>
      <div className="max-w-[1500px] mx-auto space-y-3">
        <PageHeader
          title="Attendance Summary"
          description="Monthly attendance counts by employee. Click a row to view daily records and punches."
          icon={CalendarCheck}
          breadcrumbs={[
            { label: "HR", href: "/hr/attendance" },
            { label: "Attendance" },
          ]}
        />

        <ModuleFiltersBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search employee…">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="h-8 w-[150px] text-xs bg-white">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {monthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs bg-white">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Departments</SelectItem>
              {DEPARTMENT_OPTIONS.map((d) => (
                <SelectItem key={d.value} value={d.value} className="text-xs">
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ModuleFiltersBar>

        <div className="page-shell overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
            <table className="w-full text-table">
              <thead className="sticky top-0 z-10 bg-white border-b border-border">
                <tr>
                  <SortTh label="Employee" colKey="employeeName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Employee Code" colKey="employeeCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Department" colKey="department" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Present" colKey="present" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Absent" colKey="absent" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Holiday" colKey="holiday" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-xs text-muted-foreground">
                      No attendance summary for this period.
                    </td>
                  </tr>
                ) : (
                  visible.map((row) => (
                    <tr
                      key={row.employeeId}
                      onClick={() =>
                        router.push(
                          `/hr/attendance/${row.employeeId}?month=${monthFilter}&tab=calendar`,
                        )
                      }
                      className="border-b border-border/50 hover:bg-brand-50/40 cursor-pointer"
                    >
                      <td className="px-3 py-2.5 text-xs font-medium text-brand-800">{row.employeeName}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">{row.employeeCode}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.department}</td>
                      <td className="px-3 py-2.5 text-xs text-center font-semibold text-emerald-700">{row.present}</td>
                      <td className="px-3 py-2.5 text-xs text-center font-semibold text-red-600">{row.absent}</td>
                      <td className="px-3 py-2.5 text-xs text-center font-semibold text-sky-700">{row.holiday}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
