"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  MoreVertical,
  Eye,
  Pencil,
  PanelRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { HrPageShell } from "../components/HrPageShell";
import {
  HrDataGrid,
  exportOrgCsv,
  type HrDensity,
  type HrDataGridColumn,
} from "../settings/organization/_components";
import {
  loadBranches,
  loadDepartments,
  loadDesignations,
} from "../settings/organization-data";
import {
  type HrEmployee,
  loadHrEmployees,
} from "./employee-master-data";
import {
  buildEmployeeFilterOptions,
  formatDateDisplay,
  getBranchDisplayLabel,
  getEmployeeTypeLabel,
} from "./employee-display";
import {
  EmployeeAvatar,
  EmploymentStatusChip,
} from "./components/EmployeeStatusChips";
import { EmployeeQuickView } from "./components/EmployeeQuickView";
import {
  EmployeeListingToolbar,
  EMPTY_EMPLOYEE_FILTERS,
  type EmployeeDirectoryFilters,
} from "./components/EmployeeListingToolbar";
import { EmployeeCreateDialog } from "./components/EmployeeCreateDialog";
import { EmployeeWorkspaceNav } from "./components/EmployeeWorkspaceNav";

const COLUMN_DEFS = [
  { id: "employee", label: "Employee" },
  { id: "designation", label: "Designation" },
  { id: "department", label: "Department" },
  { id: "employmentStatus", label: "Employment Status" },
  { id: "employeeCode", label: "Employee Code" },
  { id: "employeeType", label: "Employee Type" },
  { id: "dateOfJoining", label: "Date of Joining" },
  { id: "branch", label: "Branch" },
  { id: "reportingManager", label: "Reporting Manager" },
  { id: "actions", label: "Actions" },
];

export default function EmployeesPageClient({
  openCreateOnMount = false,
}: {
  openCreateOnMount?: boolean;
} = {}) {
  const router = useRouter();
  const [records, setRecords] = useState<HrEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<EmployeeDirectoryFilters>(EMPTY_EMPLOYEE_FILTERS);
  const [density, setDensity] = useState<HrDensity>("compact");
  const [visibleColumns, setVisibleColumns] = useState(COLUMN_DEFS.map((c) => c.id));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [quickView, setQuickView] = useState<HrEmployee | null>(null);
  const [createOpen, setCreateOpen] = useState(openCreateOnMount);
  const [toast, setToast] = useState<string | null>(null);
  const [orgNames, setOrgNames] = useState<{
    branchNames: string[];
    departmentNames: string[];
    designationNames: string[];
  }>({ branchNames: [], departmentNames: [], designationNames: [] });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (openCreateOnMount) setCreateOpen(true);
  }, [openCreateOnMount]);

  const refresh = useCallback(() => {
    setLoading(true);
    setRecords(loadHrEmployees());
    try {
      setOrgNames({
        branchNames: loadBranches()
          .filter((b) => b.status === "active")
          .map((b) => b.name),
        departmentNames: loadDepartments()
          .filter((d) => d.status === "active")
          .map((d) => d.name),
        designationNames: loadDesignations()
          .filter((d) => d.status === "active")
          .map((d) => d.name),
      });
    } catch {
      /* org store optional */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filterOptions = useMemo(
    () => buildEmployeeFilterOptions(records, orgNames),
    [records, orgNames],
  );

  const filtered = useMemo(() => {
    let list = [...records];
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.employeeName.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          e.emailId.toLowerCase().includes(q) ||
          e.mobileNumber.includes(q),
      );
    }
    if (filters.branch !== "all") list = list.filter((e) => e.branch === filters.branch);
    if (filters.department !== "all") list = list.filter((e) => e.department === filters.department);
    if (filters.designation !== "all") list = list.filter((e) => e.designation === filters.designation);
    if (filters.managerId !== "all") {
      list = list.filter((e) => String(e.reportingManagerId) === filters.managerId);
    }
    if (filters.employeeType !== "all") {
      list = list.filter((e) => e.employeeType === filters.employeeType);
    }
    if (filters.employmentStatus !== "all") {
      list = list.filter((e) => e.employmentStatus === filters.employmentStatus);
    }
    if (filters.dojFrom) list = list.filter((e) => e.dateOfJoining >= filters.dojFrom);
    if (filters.dojTo) list = list.filter((e) => e.dateOfJoining <= filters.dojTo);
    return list;
  }, [records, search, filters]);

  const handleExport = () => {
    const rows = (selectedIds.length ? filtered.filter((e) => selectedIds.includes(e.id)) : filtered).map(
      (e) => [
        e.employeeCode,
        e.employeeName,
        e.emailId,
        e.mobileNumber,
        e.department,
        e.designation,
        getBranchDisplayLabel(e.branch),
        e.reportingManagerName,
        getEmployeeTypeLabel(e.employeeType),
        e.dateOfJoining,
        e.employmentStatus,
      ],
    );
    exportOrgCsv(
      "employees.csv",
      [
        "Employee Code",
        "Name",
        "Email",
        "Mobile",
        "Department",
        "Designation",
        "Branch",
        "Reporting Manager",
        "Employee Type",
        "DOJ",
        "Employment Status",
      ],
      rows,
    );
  };

  const columns: HrDataGridColumn<HrEmployee>[] = useMemo(
    () => [
      {
        id: "employee",
        label: "Employee",
        sortable: true,
        sortValue: (r) => r.employeeName,
        className: "min-w-[180px]",
        render: (e) => (
          <Link
            href={`/hr/employees/${e.id}`}
            className="flex items-center gap-2.5 text-left group/emp min-w-0 max-w-[240px]"
          >
            <EmployeeAvatar name={e.employeeName} size="sm" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-foreground group-hover/emp:text-brand-700 truncate">
                {e.employeeName}
              </span>
              <span className="block text-[11px] text-muted-foreground truncate">
                {e.emailId || "—"}
              </span>
            </span>
          </Link>
        ),
      },
      {
        id: "designation",
        label: "Designation",
        sortable: true,
        sortValue: (r) => r.designation,
        render: (e) => (
          <span className="text-xs text-muted-foreground">{e.designation || "—"}</span>
        ),
      },
      {
        id: "department",
        label: "Department",
        sortable: true,
        sortValue: (r) => r.department,
        render: (e) => <span className="text-xs">{e.department || "—"}</span>,
      },
      {
        id: "employmentStatus",
        label: "Employment Status",
        sortable: true,
        sortValue: (r) => r.employmentStatus,
        render: (e) => <EmploymentStatusChip status={e.employmentStatus} />,
      },
      {
        id: "employeeCode",
        label: "Employee Code",
        sortable: true,
        sortValue: (r) => r.employeeCode,
        render: (e) => (
          <span className="font-mono text-xs text-foreground">{e.employeeCode}</span>
        ),
      },
      {
        id: "employeeType",
        label: "Employee Type",
        sortable: true,
        sortValue: (r) => r.employeeType,
        render: (e) => (
          <span className="text-xs">{getEmployeeTypeLabel(e.employeeType)}</span>
        ),
      },
      {
        id: "dateOfJoining",
        label: "Date of Joining",
        sortable: true,
        sortValue: (r) => r.dateOfJoining,
        render: (e) => (
          <span className="text-xs whitespace-nowrap">{formatDateDisplay(e.dateOfJoining)}</span>
        ),
      },
      {
        id: "branch",
        label: "Branch",
        sortable: true,
        sortValue: (r) => getBranchDisplayLabel(r.branch),
        render: (e) => (
          <span className="text-xs">{getBranchDisplayLabel(e.branch)}</span>
        ),
      },
      {
        id: "reportingManager",
        label: "Reporting Manager",
        sortable: true,
        sortValue: (r) => r.reportingManagerName,
        render: (e) => (
          <span className="text-xs text-muted-foreground">{e.reportingManagerName || "—"}</span>
        ),
      },
      {
        id: "actions",
        label: "Actions",
        headerClassName: "w-12",
        className: "w-12",
        render: (e) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label={`Actions for ${e.employeeName}`}
              >
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                Actions
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/hr/employees/${e.id}`} className="text-xs gap-2 cursor-pointer">
                  <Eye className="w-3.5 h-3.5" /> View Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs gap-2 cursor-pointer"
                onClick={() => setQuickView(e)}
              >
                <PanelRight className="w-3.5 h-3.5" /> Quick View
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/hr/employees/${e.id}/edit`} className="text-xs gap-2 cursor-pointer">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records],
  );

  return (
    <HrPageShell
      title="Employees"
      description="Manage employee records and profiles."
      icon={Users}
      className="min-w-0 max-w-full"
      maxWidthClass="w-full min-w-0 max-w-full"
      breadcrumbs={[
        { label: "HR", href: "/hr/attendance/dashboard" },
        { label: "Employees" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled
            title="Import will be available when data import is connected"
          >
            Import
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handleExport}>
            Export
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" /> Add Employee
          </Button>
        </div>
      }
    >
      <div className="w-full min-w-0 max-w-full space-y-3">
        <EmployeeWorkspaceNav activeId="directory" />

        <EmployeeListingToolbar
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onFiltersChange={setFilters}
          filterOptions={filterOptions}
          density={density}
          onDensityChange={setDensity}
          columns={COLUMN_DEFS}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          onRefresh={refresh}
          selectedCount={selectedIds.length}
          bulkActions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={handleExport}
            >
              Export Selected
            </Button>
          }
        />

        {/* Bound width so HrDataGrid's overflow-x-auto scrolls inside the card, not the page */}
        <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
          <HrDataGrid
            rows={filtered}
            columns={columns}
            visibleColumnIds={visibleColumns}
            density={density}
            loading={loading}
            isEmptyStore={!loading && records.length === 0}
            emptyTitle="No employees yet"
            emptyDescription="Add your first employee to start building the directory."
            emptyActionLabel="+ Add Employee"
            onEmptyAction={() => setCreateOpen(true)}
            onClearFilters={() => {
              setSearch("");
              setFilters({ ...EMPTY_EMPLOYEE_FILTERS });
            }}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            pageSize={12}
          />
        </div>
      </div>

      <EmployeeCreateDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open && openCreateOnMount) {
            router.replace("/hr/employees");
          }
        }}
        onCreated={(id) => {
          refresh();
          setToast("Employee created successfully.");
          router.push(`/hr/employees/${id}`);
        }}
      />

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl bg-emerald-600 text-white text-sm font-medium animate-in slide-in-from-bottom-2 fade-in-0 duration-300"
        >
          {toast}
        </div>
      )}

      <EmployeeQuickView
        employee={quickView}
        open={!!quickView}
        onOpenChange={(o) => {
          if (!o) setQuickView(null);
        }}
      />
    </HrPageShell>
  );
}
