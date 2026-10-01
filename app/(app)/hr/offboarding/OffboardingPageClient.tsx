"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Eye, LogOut, Pencil, Play, Plus, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HrPageShell } from "@/app/(app)/hr/components/HrPageShell";
import { HrSuccessToast } from "@/app/(app)/hr/components/HrSuccessToast";
import { hrBreadcrumb } from "@/lib/hr/hr-nav";
import {
  HrConfirmDialog,
  HrEmptyState,
  HrIconActionButton,
  HrLoadingRows,
  HrNoResultsState,
  hrBtn,
} from "@/app/(app)/hr/settings/organization/_components";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateDisplay } from "@/app/(app)/hr/employees/employee-display";
import { HrDateInput } from "@/app/(app)/hr/components/HrDateInput";
import { HrLetterCombobox } from "@/app/(app)/hr/hr-letters/components/HrLetterCombobox";
import {
  ACTIVE_OFFBOARDING_STATUSES,
  clearanceSummary,
  deleteOffboarding,
  EXIT_TYPE_OPTIONS,
  exitTypeLabel,
  hasMeaningfulActivity,
  HR_OFFBOARDING_EVENT,
  isPendingResignation,
  loadOffboarding,
  offboardingSourceLabel,
  seedDevEmployeeResignation,
  shortfallDays,
  type OffboardingExitType,
  type OffboardingRecord,
} from "./offboarding-data";
import { OffboardingStatusPill } from "./components/OffboardingStatusPill";
import { StartOffboardingDrawer } from "./components/StartOffboardingDrawer";
import { ResignationReviewDrawer } from "./components/ResignationReviewDrawer";

type TabId = "pending" | "active" | "completed" | "all";

const TABS: { id: TabId; label: string }[] = [
  { id: "pending", label: "Pending Requests" },
  { id: "active", label: "Active Offboarding" },
  { id: "completed", label: "Completed" },
  { id: "all", label: "All" },
];

const TAB_IDS = new Set<TabId>(TABS.map((t) => t.id));

function parseTab(raw: string | null): TabId | null {
  if (raw && TAB_IDS.has(raw as TabId)) return raw as TabId;
  return null;
}

export default function OffboardingPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<OffboardingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>(() => parseTab(searchParams.get("tab")) ?? "active");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [lwdFrom, setLwdFrom] = useState("");
  const [lwdTo, setLwdTo] = useState("");
  const [startOpen, setStartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OffboardingRecord | null>(null);
  const [reviewRec, setReviewRec] = useState<OffboardingRecord | null>(null);
  const [filterSource, setFilterSource] = useState("all");
  const isDev = process.env.NODE_ENV === "development";

  const refresh = useCallback(() => {
    setLoading(true);
    setRows(loadOffboarding());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const onUpd = () => refresh();
    window.addEventListener(HR_OFFBOARDING_EVENT, onUpd);
    return () => window.removeEventListener(HR_OFFBOARDING_EVENT, onUpd);
  }, [refresh]);

  useEffect(() => {
    const next = parseTab(searchParams.get("tab"));
    if (next) setTab(next);
  }, [searchParams]);

  useEffect(() => {
    try {
      const flash = sessionStorage.getItem("ds_hr_offboarding_flash");
      if (flash) {
        sessionStorage.removeItem("ds_hr_offboarding_flash");
        setToast(flash);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const goToTab = (id: TabId) => {
    setTab(id);
    router.replace(`${pathname}?tab=${id}`);
  };

  const counts = useMemo(
    () => ({
      pending: rows.filter((r) => isPendingResignation(r)).length,
      active: rows.filter((r) => ACTIVE_OFFBOARDING_STATUSES.includes(r.status)).length,
      completed: rows.filter((r) => r.status === "completed").length,
      all: rows.length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    let list = rows;
    if (tab === "pending") list = list.filter((r) => isPendingResignation(r));
    if (tab === "active") list = list.filter((r) => ACTIVE_OFFBOARDING_STATUSES.includes(r.status));
    if (tab === "completed") list = list.filter((r) => r.status === "completed");
    if (filterType !== "all") list = list.filter((r) => r.exitType === filterType);
    if (tab === "all" && filterStatus !== "all") list = list.filter((r) => r.status === filterStatus);
    if (tab === "all" && filterSource !== "all") list = list.filter((r) => r.source === filterSource);
    if (lwdFrom) {
      list = list.filter((r) => {
        const lwd = r.lastWorkingDate || r.proposedLastWorkingDate || "";
        return lwd >= lwdFrom;
      });
    }
    if (lwdTo) {
      list = list.filter((r) => {
        const lwd = r.lastWorkingDate || r.proposedLastWorkingDate || "";
        return lwd <= lwdTo;
      });
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) || r.employeeCode.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, tab, filterType, filterStatus, filterSource, lwdFrom, lwdTo, search]);

  const clearFilters = () => {
    setSearch("");
    setFilterType("all");
    setFilterStatus("all");
    setFilterSource("all");
    setLwdFrom("");
    setLwdTo("");
  };

  const openRecord = (r: OffboardingRecord) => {
    if (isPendingResignation(r)) {
      setReviewRec(r);
      return;
    }
    router.push(`/hr/offboarding/${r.id}`);
  };

  return (
    <HrPageShell
      title="Offboarding"
      description="Manage employee exits, clearance and final documentation."
      icon={LogOut}
      breadcrumbs={hrBreadcrumb({ label: "Offboarding" })}
      maxWidthClass="max-w-[1400px]"
      actions={
        <div className="flex items-center gap-2">
          {isDev ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={hrBtn("gap-1.5 text-[11px]")}
              onClick={() => {
                const result = seedDevEmployeeResignation();
                setToast(result.ok ? "Dev: demo resignation seeded." : result.error);
                refresh();
                if (result.ok) goToTab("pending");
              }}
            >
              Dev: Seed Resignation
            </Button>
          ) : null}
          <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={() => setStartOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Start Offboarding
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goToTab(t.id)}
              className={cn(
                "h-9 px-3 text-xs font-medium border-b-2 -mb-px inline-flex items-center gap-1.5",
                tab === t.id
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className="text-[10px] tabular-nums">{counts[t.id]}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee name or code…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-[10px] bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium",
                  filterType !== "all" ||
                    filterStatus !== "all" ||
                    filterSource !== "all" ||
                    lwdFrom ||
                    lwdTo
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-0">
              <div className="px-3 py-2.5 border-b border-border text-xs font-semibold">Filters</div>
              <div className="px-3 py-2.5 space-y-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium">Exit Type</p>
                  <HrLetterCombobox
                    value={filterType}
                    onChange={setFilterType}
                    placeholder="All"
                    options={[
                      { value: "all", label: "All types" },
                      ...EXIT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                    ]}
                  />
                </div>
                {tab === "all" ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium">Status</p>
                      <HrLetterCombobox
                        value={filterStatus}
                        onChange={setFilterStatus}
                        placeholder="All"
                        options={[
                          { value: "all", label: "All statuses" },
                          { value: "pending_review", label: "Pending Review" },
                          { value: "initiated", label: "Initiated" },
                          { value: "notice_period", label: "Notice Period" },
                          { value: "clearance_pending", label: "Clearance Pending" },
                          { value: "ready_for_exit", label: "Ready for Exit" },
                          { value: "completed", label: "Completed" },
                          { value: "cancelled", label: "Cancelled" },
                          { value: "rejected", label: "Rejected" },
                        ]}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium">Source</p>
                      <HrLetterCombobox
                        value={filterSource}
                        onChange={setFilterSource}
                        placeholder="All"
                        options={[
                          { value: "all", label: "All sources" },
                          { value: "employee", label: "Employee" },
                          { value: "hr", label: "HR" },
                        ]}
                      />
                    </div>
                  </>
                ) : null}
                <div className="space-y-1">
                  <p className="text-[11px] font-medium">LWD from</p>
                  <HrDateInput value={lwdFrom} onChange={setLwdFrom} />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium">LWD to</p>
                  <HrDateInput value={lwdTo} onChange={setLwdTo} />
                </div>
              </div>
              <div className="px-3 py-2 border-t border-border">
                <button type="button" className="text-xs text-brand-600 hover:underline" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            </PopoverContent>
          </Popover>
          {filterType !== "all" ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md">
              {exitTypeLabel(filterType as OffboardingExitType)}
              <button type="button" onClick={() => setFilterType("all")}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ) : null}
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {(tab === "pending"
                    ? [
                        "Employee",
                        "Employee Code",
                        "Resignation Date",
                        "Proposed LWD",
                        "Reason",
                        "Notice Period",
                        "Submitted On",
                        "Status",
                        "Actions",
                      ]
                    : tab === "completed"
                      ? [
                          "Employee",
                          "Employee Code",
                          "Exit Type",
                          "Final LWD",
                          "Completed On",
                          "Status",
                          "Actions",
                        ]
                      : [
                          "Employee",
                          "Employee Code",
                          "Exit Type",
                          "Resignation / Initiated Date",
                          "Last Working Date",
                          "Notice Period",
                          "Clearance",
                          "Status",
                          "Actions",
                        ]
                  ).map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap",
                        h === "Actions" && "text-right",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <HrLoadingRows cols={9} rows={4} />
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <HrEmptyState
                        title="No offboarding records yet."
                        description="Start an exit process for an active employee, or wait for employee resignations."
                        actionLabel="+ Start Offboarding"
                        onAction={() => setStartOpen(true)}
                      />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <HrNoResultsState onClear={clearFilters} />
                    </td>
                  </tr>
                ) : tab === "pending" ? (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-b border-border/60 hover:bg-muted/20 group">
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          className="text-xs font-semibold hover:text-brand-700"
                          onClick={() => openRecord(r)}
                        >
                          {r.employeeName}
                        </button>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs font-semibold text-brand-700">
                        {r.employeeCode}
                      </td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        {r.resignationDate ? formatDateDisplay(r.resignationDate) : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        {r.proposedLastWorkingDate
                          ? formatDateDisplay(r.proposedLastWorkingDate)
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs max-w-[160px] truncate" title={r.reason}>
                        {r.reason || "—"}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {r.requiredNoticeDays ? `${r.requiredNoticeDays}d` : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        {r.submittedAt
                          ? formatDateDisplay(r.submittedAt.slice(0, 10))
                          : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <OffboardingStatusPill status={r.status} />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end">
                          <HrIconActionButton label="Review" onClick={() => openRecord(r)}>
                            <Eye />
                          </HrIconActionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : tab === "completed" ? (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-b border-border/60 hover:bg-muted/20 group">
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          className="text-xs font-semibold hover:text-brand-700"
                          onClick={() => openRecord(r)}
                        >
                          {r.employeeName}
                        </button>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs font-semibold text-brand-700">
                        {r.employeeCode}
                      </td>
                      <td className="px-4 py-2 text-xs">{exitTypeLabel(r.exitType)}</td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        {r.lastWorkingDate ? formatDateDisplay(r.lastWorkingDate) : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        {r.completedOn
                          ? formatDateDisplay(r.completedOn.slice(0, 10))
                          : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <OffboardingStatusPill status={r.status} />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end">
                          <HrIconActionButton label="View" onClick={() => openRecord(r)}>
                            <Eye />
                          </HrIconActionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  filtered.map((r) => {
                    const notice =
                      r.requiredNoticeDays || r.servedNoticeDays
                        ? `${r.servedNoticeDays || "0"}/${r.requiredNoticeDays || "—"}d`
                        : "—";
                    const shortfall = shortfallDays(r.requiredNoticeDays, r.servedNoticeDays);
                    return (
                      <tr key={r.id} className="border-b border-border/60 hover:bg-muted/20 group">
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            className="text-xs font-semibold hover:text-brand-700"
                            onClick={() => openRecord(r)}
                          >
                            {r.employeeName}
                          </button>
                          {tab === "all" || r.source === "employee" ? (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {offboardingSourceLabel(r.source)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs font-semibold text-brand-700">
                          {r.employeeCode}
                        </td>
                        <td className="px-4 py-2 text-xs">{exitTypeLabel(r.exitType)}</td>
                        <td className="px-4 py-2 text-xs whitespace-nowrap">
                          {formatDateDisplay(
                            r.resignationDate || r.terminationDate || r.initiatedDate,
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs whitespace-nowrap">
                          {r.lastWorkingDate
                            ? formatDateDisplay(r.lastWorkingDate)
                            : r.proposedLastWorkingDate
                              ? formatDateDisplay(r.proposedLastWorkingDate)
                              : "—"}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          {notice}
                          {shortfall != null && shortfall > 0 ? (
                            <span className="block text-[10px] text-amber-700">
                              Shortfall {shortfall}d
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          {r.status === "rejected" || r.status === "pending_review"
                            ? "—"
                            : clearanceSummary(r)}
                        </td>
                        <td className="px-4 py-2">
                          <OffboardingStatusPill status={r.status} />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-0.5">
                            <HrIconActionButton label="View" onClick={() => openRecord(r)}>
                              <Eye />
                            </HrIconActionButton>
                            {ACTIVE_OFFBOARDING_STATUSES.includes(r.status) ? (
                              <>
                                <HrIconActionButton label="Edit" onClick={() => openRecord(r)}>
                                  <Pencil />
                                </HrIconActionButton>
                                <HrIconActionButton
                                  label="Continue Process"
                                  onClick={() => openRecord(r)}
                                >
                                  <Play />
                                </HrIconActionButton>
                              </>
                            ) : null}
                            {r.status === "initiated" && !hasMeaningfulActivity(r) ? (
                              <HrIconActionButton
                                label="Delete"
                                destructive
                                onClick={() => setDeleteTarget(r)}
                              >
                                <Trash2 />
                              </HrIconActionButton>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length > 0 ? (
            <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
              <span className="font-medium text-foreground">{rows.length}</span> records
            </div>
          ) : null}
        </div>
      </div>

      <StartOffboardingDrawer open={startOpen} onOpenChange={setStartOpen} />

      <ResignationReviewDrawer
        open={!!reviewRec}
        record={reviewRec}
        onClose={() => setReviewRec(null)}
        onDone={(msg) => {
          setToast(msg);
          refresh();
          if (msg.toLowerCase().includes("accepted")) goToTab("active");
        }}
      />

      <HrConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        destructive
        title="Delete offboarding?"
        description="Only unused records with no checklist or letter activity can be deleted."
        confirmLabel="Delete"
        onConfirm={() => {
          if (!deleteTarget) return;
          const result = deleteOffboarding(deleteTarget.id);
          setToast(result.ok ? "Record deleted." : result.error);
          setDeleteTarget(null);
          refresh();
        }}
      />

      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </HrPageShell>
  );
}
