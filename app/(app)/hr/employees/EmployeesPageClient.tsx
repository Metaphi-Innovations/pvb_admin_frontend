"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
import { EmptyModuleState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus, MoreVertical, Eye, Edit2, Trash2, ChevronDown, ChevronsUpDown, Users } from "lucide-react";
import { HrStatusBadge } from "../components/HrStatusBadge";
import { DEPARTMENT_OPTIONS } from "@/lib/hr/config";
import {
  type HrEmployee,
  loadHrEmployees,
  saveHrEmployees,
} from "./employee-master-data";

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
        "px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap",
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

export default function EmployeeMasterPage() {
  const router = useRouter();
  const [records, setRecords] = useState<HrEmployee[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("employeeName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const refresh = useCallback(() => setRecords(loadHrEmployees()), []);
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
        (e) =>
          e.employeeName.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          e.mobileNumber.includes(q) ||
          e.designation.toLowerCase().includes(q),
      );
    }
    if (deptFilter !== "all") r = r.filter((e) => e.department === deptFilter);
    if (statusFilter !== "all") r = r.filter((e) => e.status === statusFilter);
    r.sort((a, b) => {
      const av = String(a[sortKey as keyof HrEmployee] ?? "");
      const bv = String(b[sortKey as keyof HrEmployee] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return r;
  }, [records, search, deptFilter, statusFilter, sortKey, sortDir]);

  const handleDelete = (id: number) => {
    if (!confirm("Delete this employee record?")) return;
    saveHrEmployees(records.filter((e) => e.id !== id));
    refresh();
  };

  const toggleStatus = (e: HrEmployee) => {
    const next = e.status === "active" ? "inactive" : "active";
    saveHrEmployees(records.map((r) => (r.id === e.id ? { ...r, status: next, updatedAt: new Date().toISOString().slice(0, 10) } : r)));
    refresh();
  };

  return (
    <AppLayout>
      <div className="max-w-[1320px] mx-auto space-y-3">
        <PageHeader
          title="Employee Master"
          description="Source for attendance, claims, targets, and approvals."
          icon={Users}
          breadcrumbs={[
            { label: "HR", href: "/hr/employees" },
            { label: "Employee Master" },
          ]}
          actions={
            <Button onClick={() => router.push("/hr/employees/new")}>
              <Plus className="w-3.5 h-3.5" />
              Add Employee
            </Button>
          }
        />

        <ModuleFiltersBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search name, code, mobile…"
        >
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs bg-white">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Departments
              </SelectItem>
              {DEPARTMENT_OPTIONS.map((d) => (
                <SelectItem key={d.value} value={d.value} className="text-xs">
                  {d.label}
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
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 border-b border-border/60">
                <tr>
                  <SortTh label="Employee Code" colKey="employeeCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Employee Name" colKey="employeeName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Designation" colKey="designation" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Department" colKey="department" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Reporting Manager" colKey="reportingManagerName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Mobile" colKey="mobileNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Status</th>
                  <SortTh label="Created By" colKey="createdBy" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Updated By" colKey="updatedBy" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-3 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <EmptyModuleState
                        module="Employee"
                        onAdd={() => router.push("/hr/employees/new")}
                      />
                    </td>
                  </tr>
                ) : (
                  visible.map((e) => (
                    <tr key={e.id} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono text-[11px]">{e.employeeCode}</td>
                      <td className="px-3 py-2 font-medium">{e.employeeName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.designation}</td>
                      <td className="px-3 py-2">{e.department}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.reportingManagerName}</td>
                      <td className="px-3 py-2 font-mono">{e.mobileNumber}</td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => toggleStatus(e)} className="cursor-pointer">
                          <HrStatusBadge status={e.status} />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{e.createdBy}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.updatedBy}</td>
                      <td className="px-3 py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem asChild>
                              <Link href={`/hr/employees/${e.id}`} className="text-xs gap-2 cursor-pointer">
                                <Eye className="w-3.5 h-3.5" /> View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/hr/employees/${e.id}/edit`} className="text-xs gap-2 cursor-pointer">
                                <Edit2 className="w-3.5 h-3.5" /> Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs gap-2 text-red-600 cursor-pointer"
                              onClick={() => handleDelete(e.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t border-border/40 text-[11px] text-muted-foreground">
            {visible.length} of {records.length} employees
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
