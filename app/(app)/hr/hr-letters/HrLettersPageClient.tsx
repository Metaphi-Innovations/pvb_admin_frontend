"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, FileCheck, FileText, Pencil, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
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
import { HrDateInput } from "@/app/(app)/hr/components/HrDateInput";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateDisplay } from "@/app/(app)/hr/employees/employee-display";
import type { GeneratedHrDocument, GeneratedHrDocumentStatus, HrTemplateTypeKey } from "@/app/(app)/hr/settings/hr-template-data";
import {
  deleteHrLetterDraft,
  HR_LETTER_TYPE_OPTIONS,
  hrLetterTypeLabel,
  issueHrLetter,
  letterStatusLabel,
  listHrLetters,
  regenerateHrLetter,
  type HrLetterStatusTab,
} from "./hr-letters-data";
import { HrLetterCreateDrawer } from "./components/HrLetterCreateDrawer";
import { HrLetterViewDrawer } from "./components/HrLetterViewDrawer";
import { HrLetterCombobox } from "./components/HrLetterCombobox";

function StatusPill({ status }: { status: GeneratedHrDocumentStatus }) {
  const cls =
    status === "issued"
      ? "bg-emerald-50 text-emerald-700"
      : status === "generated"
        ? "bg-navy-50 text-navy-700"
        : "bg-slate-100 text-slate-600";
  const dot =
    status === "issued"
      ? "bg-emerald-500"
      : status === "generated"
        ? "bg-navy-500"
        : "bg-slate-400";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
      {letterStatusLabel(status)}
    </span>
  );
}

const TABS: { id: HrLetterStatusTab; label: string }[] = [
  { id: "all", label: "All Letters" },
  { id: "draft", label: "Draft" },
  { id: "generated", label: "Generated" },
  { id: "issued", label: "Issued" },
];

export default function HrLettersPageClient({
  initialEmployeeId,
  openCreateOnMount,
}: {
  initialEmployeeId?: number | null;
  openCreateOnMount?: boolean;
} = {}) {
  const [rows, setRows] = useState<GeneratedHrDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<HrLetterStatusTab>("all");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [issueFrom, setIssueFrom] = useState("");
  const [issueTo, setIssueTo] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(!!openCreateOnMount);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lockedEmployeeId, setLockedEmployeeId] = useState<number | null>(initialEmployeeId ?? null);
  const [viewLetter, setViewLetter] = useState<GeneratedHrDocument | null>(null);
  const [confirm, setConfirm] = useState<
    | { type: "issue"; letter: GeneratedHrDocument }
    | { type: "delete"; letter: GeneratedHrDocument }
    | { type: "regenerate"; letter: GeneratedHrDocument }
    | null
  >(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setRows(listHrLetters());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const onUpd = () => refresh();
    window.addEventListener("hr-generated-documents-updated", onUpd);
    return () => window.removeEventListener("hr-generated-documents-updated", onUpd);
  }, [refresh]);

  useEffect(() => {
    if (openCreateOnMount) {
      setCreateOpen(true);
      setLockedEmployeeId(initialEmployeeId ?? null);
    }
  }, [openCreateOnMount, initialEmployeeId]);

  const counts = useMemo(() => {
    return {
      all: rows.length,
      draft: rows.filter((r) => r.status === "draft").length,
      generated: rows.filter((r) => r.status === "generated").length,
      issued: rows.filter((r) => r.status === "issued").length,
    };
  }, [rows]);

  const filterActive =
    filterType !== "all" ||
    (tab === "all" && filterStatus !== "all") ||
    !!issueFrom ||
    !!issueTo ||
    !!search.trim();

  const filtered = useMemo(() => {
    let list = rows;
    if (tab !== "all") list = list.filter((r) => r.status === tab);
    if (tab === "all" && filterStatus !== "all") {
      list = list.filter((r) => r.status === filterStatus);
    }
    if (filterType !== "all") list = list.filter((r) => r.templateType === filterType);
    if (issueFrom) list = list.filter((r) => (r.issueDate || "") >= issueFrom);
    if (issueTo) list = list.filter((r) => (r.issueDate || "") <= issueTo);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, tab, filterStatus, filterType, issueFrom, issueTo, search]);

  const clearFilters = () => {
    setSearch("");
    setFilterType("all");
    setFilterStatus("all");
    setIssueFrom("");
    setIssueTo("");
  };

  const openCreate = (empId?: number | null) => {
    setDraftId(null);
    setLockedEmployeeId(empId ?? null);
    setCreateOpen(true);
  };

  const openEditDraft = (letter: GeneratedHrDocument) => {
    setDraftId(letter.id);
    setLockedEmployeeId(null);
    setCreateOpen(true);
  };

  const handleConfirm = () => {
    if (!confirm) return;
    if (confirm.type === "issue") {
      const result = issueHrLetter(confirm.letter.id);
      setToast(result.ok ? "Letter issued." : result.error);
    } else if (confirm.type === "delete") {
      const result = deleteHrLetterDraft(confirm.letter.id);
      setToast(result.ok ? "Draft deleted." : result.error);
    } else if (confirm.type === "regenerate") {
      const result = regenerateHrLetter(confirm.letter.id);
      setToast(result.ok ? "Letter regenerated." : result.error);
    }
    setConfirm(null);
    refresh();
  };

  return (
    <HrPageShell
      title="HR Letters"
      description="Create, generate and manage employee HR letters."
      icon={FileText}
      breadcrumbs={hrBreadcrumb({ label: "HR Letters" })}
      maxWidthClass="max-w-[1400px]"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={() => openCreate()}>
          <Plus className="w-3.5 h-3.5" /> Create HR Letter
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "h-9 px-3 text-xs font-medium border-b-2 -mb-px transition-colors inline-flex items-center gap-1.5",
                tab === t.id
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "text-[10px] font-semibold tabular-nums",
                  tab === t.id ? "text-brand-600" : "text-muted-foreground/80",
                )}
              >
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee name or code…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-[10px] bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                  filterActive && (filterType !== "all" || filterStatus !== "all" || issueFrom || issueTo)
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-0">
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Filters</p>
              </div>
              <div className="px-3 py-2.5 space-y-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium">Letter Type</p>
                  <HrLetterCombobox
                    value={filterType}
                    onChange={setFilterType}
                    placeholder="All types"
                    options={[
                      { value: "all", label: "All types" },
                      ...HR_LETTER_TYPE_OPTIONS.map((o) => ({
                        value: o.value,
                        label: o.label,
                      })),
                    ]}
                  />
                </div>
                {tab === "all" ? (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium">Status</p>
                    <HrLetterCombobox
                      value={filterStatus}
                      onChange={setFilterStatus}
                      placeholder="All statuses"
                      options={[
                        { value: "all", label: "All statuses" },
                        { value: "draft", label: "Draft" },
                        { value: "generated", label: "Generated" },
                        { value: "issued", label: "Issued" },
                      ]}
                    />
                  </div>
                ) : null}
                <div className="space-y-1">
                  <p className="text-[11px] font-medium">Issue date from</p>
                  <HrDateInput value={issueFrom} onChange={setIssueFrom} placeholder="From" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium">Issue date to</p>
                  <HrDateInput value={issueTo} onChange={setIssueTo} placeholder="To" />
                </div>
              </div>
              {filterActive ? (
                <div className="px-3 py-2 border-t border-border">
                  <button type="button" onClick={clearFilters} className="text-xs text-brand-600 hover:underline">
                    Clear filters
                  </button>
                </div>
              ) : null}
            </PopoverContent>
          </Popover>

          <HrIconActionButton label="Refresh" onClick={refresh}>
            <RefreshCw />
          </HrIconActionButton>

          {filterType !== "all" ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
              {hrLetterTypeLabel(filterType as HrTemplateTypeKey)}
              <button type="button" onClick={() => setFilterType("all")} aria-label="Clear type">
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
                  {[
                    "Employee",
                    "Employee Code",
                    "Letter Type",
                    "Template",
                    "Issue Date",
                    "Generated On",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap",
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
                  <HrLoadingRows cols={8} rows={5} />
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <HrEmptyState
                        title="No HR letters created yet."
                        description="Create a letter from an active employee and a Template Management template."
                        actionLabel="+ Create HR Letter"
                        onAction={() => openCreate()}
                      />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <HrNoResultsState onClear={clearFilters} />
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-border/60 hover:bg-muted/20 transition-colors group"
                    >
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          className="text-xs font-semibold text-foreground hover:text-brand-700 text-left"
                          onClick={() => setViewLetter(r)}
                        >
                          {r.employeeName}
                        </button>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs font-semibold text-brand-700">
                        {r.employeeCode}
                      </td>
                      <td className="px-4 py-2 text-xs">{hrLetterTypeLabel(r.templateType)}</td>
                      <td className="px-4 py-2 text-xs">{r.templateName || "—"}</td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        {r.issueDate ? formatDateDisplay(r.issueDate) : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        {r.generatedOn ? formatDateDisplay(r.generatedOn.slice(0, 10)) : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-0.5">
                          <HrIconActionButton label="View" onClick={() => setViewLetter(r)}>
                            <Eye />
                          </HrIconActionButton>
                          {r.status === "draft" ? (
                            <HrIconActionButton label="Edit Draft" onClick={() => openEditDraft(r)}>
                              <Pencil />
                            </HrIconActionButton>
                          ) : null}
                          <HrIconActionButton label="Preview" onClick={() => setViewLetter(r)}>
                            <FileText />
                          </HrIconActionButton>
                          {r.status === "generated" ? (
                            <>
                              <HrIconActionButton
                                label="Issue"
                                onClick={() => setConfirm({ type: "issue", letter: r })}
                              >
                                <FileCheck />
                              </HrIconActionButton>
                              <HrIconActionButton
                                label="Regenerate"
                                onClick={() => setConfirm({ type: "regenerate", letter: r })}
                              >
                                <RefreshCw />
                              </HrIconActionButton>
                            </>
                          ) : null}
                          {r.status === "draft" ? (
                            <HrIconActionButton
                              label="Delete Draft"
                              destructive
                              onClick={() => setConfirm({ type: "delete", letter: r })}
                            >
                              <Trash2 />
                            </HrIconActionButton>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length > 0 ? (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/20">
              <p className="text-[11px] text-muted-foreground">
                Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
                <span className="font-medium text-foreground">{rows.length}</span> records
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <HrLetterCreateDrawer
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setDraftId(null);
        }}
        draftId={draftId}
        lockedEmployeeId={lockedEmployeeId}
        onSaved={(msg) => {
          setToast(msg);
          refresh();
        }}
      />

      <HrLetterViewDrawer
        open={!!viewLetter}
        letter={viewLetter}
        onClose={() => setViewLetter(null)}
      />

      <HrConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        destructive={confirm?.type === "delete"}
        title={
          confirm?.type === "issue"
            ? "Issue letter?"
            : confirm?.type === "delete"
              ? "Delete draft?"
              : "Regenerate letter?"
        }
        description={
          confirm?.type === "issue"
            ? `Issue this ${hrLetterTypeLabel(confirm.letter.templateType)} to ${confirm.letter.employeeName}?`
            : confirm?.type === "delete"
              ? `Delete the draft for ${confirm.letter.employeeName}? This cannot be undone.`
              : `Regenerate this letter from the current template and employee data? The unissued snapshot will be replaced.`
        }
        confirmLabel={
          confirm?.type === "issue" ? "Issue" : confirm?.type === "delete" ? "Delete" : "Regenerate"
        }
      />

      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </HrPageShell>
  );
}
