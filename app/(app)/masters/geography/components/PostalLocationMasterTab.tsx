"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2, Download, Edit2, Eye, MoreHorizontal, Plus, Search, Upload, X, XCircle, AlertTriangle,
} from "lucide-react";
import { isPostalMasterSuperAdmin } from "@/lib/geography/config";
import { getPostalMasterCacheVersion } from "@/lib/geography/postal-master-store";
import { MasterListing } from "@/components/listing/MasterListing";
import { ListingStatusToggle, isActiveStatus } from "@/components/listing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { addAuditEntry } from "../geography-audit-data";
import {
  downloadPincodeSampleTemplate,
  downloadDemoPostalJson,
  exportPostalData,
  getDistinctDistricts,
  getDistinctStates,
  queryPostalMasterRecords,
  setPincodeStatus,
  type PincodeRecord,
} from "../pincode-data";
import { PincodeViewDialog } from "./PincodeViewDialog";
import { PincodeUploadDialog } from "./PincodeUploadDialog";
import { PincodeFormDialog } from "./PincodeFormDialog";

interface ToastState { msg: string; type: "success" | "error" }

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className={cn("fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium", toast.type === "success" ? "bg-emerald-600" : "bg-red-600")}>
      {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function PostalLocationMasterTab(props: {
  onWorkflowChange?: () => void;
  postalRecordCount?: number;
  postalHydrating?: boolean;
} = {}) {
  const { onWorkflowChange, postalRecordCount = 0, postalHydrating = false } = props;
  const [listVersion, setListVersion] = useState(0);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [stateFilter, setStateFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewRecord, setViewRecord] = useState<PincodeRecord | null>(null);
  const [formRecord, setFormRecord] = useState<PincodeRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<PincodeRecord | null>(null);
  const canManagePostal = isPostalMasterSuperAdmin();

  const refresh = useCallback(() => {
    setListVersion(getPostalMasterCacheVersion());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, postalRecordCount]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t); }, [toast]);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => setToast({ msg, type }), []);
  const stateOptions = useMemo(() => getDistinctStates(), [listVersion]);
  const districtOptions = useMemo(() => getDistinctDistricts(stateFilter), [stateFilter, listVersion]);

  const hasActiveFilters = Boolean(search.trim() || stateFilter || districtFilter || statusFilter);

  const { rows: paginated, total: filteredTotal } = useMemo(() => {
    void listVersion;
    return queryPostalMasterRecords({
      search: debouncedSearch,
      state: stateFilter || undefined,
      district: districtFilter || undefined,
      status: statusFilter || undefined,
      sortKey: sort.key ? (sort.key as keyof PincodeRecord) : "",
      sortDirection: sort.direction,
      page,
      pageSize,
    });
  }, [listVersion, debouncedSearch, stateFilter, districtFilter, statusFilter, sort, page, pageSize]);

  useEffect(() => { setPage(1); }, [debouncedSearch, stateFilter, districtFilter, statusFilter, sort, pageSize]);

  const clearFilters = () => {
    setSearch("");
    setStateFilter("");
    setDistrictFilter("");
    setStatusFilter("");
    setFilters({});
  };

  const confirmStatusToggle = useCallback(() => {
    if (!statusConfirmTarget) return;
    const nextActive = statusConfirmTarget.status !== "active";
    setPincodeStatus(statusConfirmTarget.id, nextActive ? "active" : "inactive");
    setStatusConfirmTarget(null);
    refresh();
    showToast(`Postal record ${nextActive ? "activated" : "deactivated"}.`);
  }, [statusConfirmTarget, refresh, showToast]);

  const actions = useMemo<ActionItemConfig<PincodeRecord>[]>(() => {
    const items: ActionItemConfig<PincodeRecord>[] = [
      { label: "View", action: "view", icon: Eye, onClick: (row) => setViewRecord(row) },
    ];
    if (canManagePostal) {
      items.push({
        label: "Edit",
        action: "edit",
        icon: Edit2,
        onClick: (row) => {
          setFormRecord(row);
          setFormOpen(true);
        },
      });
    }
    return items;
  }, [canManagePostal]);

  const columns = useMemo<ColumnConfig<PincodeRecord>[]>(() => [
    { key: "pincode", header: "Pincode", sortable: true, render: (v) => <span className="font-mono text-xs font-semibold">{v}</span> },
    { key: "stateName", header: "State", sortable: true, render: (v) => <span className="text-xs">{v}</span> },
    { key: "district", header: "District", sortable: true, render: (v) => <span className="text-xs">{v}</span> },
    { key: "city", header: "City", sortable: true, render: (v) => <span className="text-xs">{v}</span> },
    { key: "town", header: "Town", sortable: true, render: (v) => <span className="text-xs font-medium">{v}</span> },
    { key: "deliveryStatus", header: "Delivery", sortable: true, render: (v) => <span className="text-xs">{v}</span> },
    { key: "status", header: "Status", width: "120px", render: (_v, row) => (
      <ListingStatusToggle active={isActiveStatus(row.status)} onChange={() => setStatusConfirmTarget(row)} />
    ) },
    { key: "createdDate", header: "Created Date", sortable: true, render: (v) => <span className="text-xs font-mono">{v}</span> },
    { key: "updatedDate", header: "Updated Date", sortable: true, render: (v) => <span className="text-xs font-mono">{v}</span> },
  ], []);

  return (
    <div className="space-y-3">
      {postalHydrating && (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          Loading postal records…
        </div>
      )}
      {!postalHydrating && postalRecordCount === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          Postal Master data is not loaded. Please upload India Post data first using Bulk Upload, or import via{" "}
          <code className="text-[10px]">npm run import:postal</code>.
        </div>
      )}
      {!postalHydrating && postalRecordCount > 0 && (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
          Showing paginated results from <span className="font-semibold text-foreground">{postalRecordCount.toLocaleString()}</span> postal records.
          Use search and filters to narrow down — one pincode can have multiple towns (post offices).
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-base font-semibold">Postal Master</h2>
        <div className="flex flex-wrap items-center gap-2">
          {canManagePostal && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => {
                setFormRecord(null);
                setFormOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Postal Record
            </Button>
          )}
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5" onClick={() => setUploadOpen(true)}>
            <Upload className="w-3.5 h-3.5" /> Bulk Upload
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={downloadPincodeSampleTemplate}>
            <Download className="w-3.5 h-3.5" /> Download Template
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => exportPostalData()}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-xs" onClick={downloadDemoPostalJson}>Download JSON Template</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-xs rounded-lg"
            placeholder="Search pincode, state, district, city, town…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={stateFilter || "__all__"}
          onValueChange={(v) => {
            setStateFilter(v === "__all__" ? "" : v);
            setDistrictFilter("");
          }}
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">All States</SelectItem>
            {stateOptions.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={districtFilter || "__all__"} onValueChange={(v) => setDistrictFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="District" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">All Districts</SelectItem>
            {districtOptions.map((d) => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">All Status</SelectItem>
            <SelectItem value="active" className="text-xs">Active</SelectItem>
            <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground gap-1" onClick={clearFilters}>
            <X className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </div>

      <MasterListing<PincodeRecord>
        columns={columns}
        data={postalHydrating ? [] : paginated}
        loading={postalHydrating}
        totalRecords={postalHydrating ? 0 : filteredTotal}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={setSort}
        onFilterChange={setFilters}
        hideSearch
        emptyMessage="postal records — upload India Post master to begin"
        currentFilters={filters}
        currentSort={sort}
        actions={actions}
      />

      <PincodeViewDialog open={!!viewRecord} onClose={() => setViewRecord(null)} record={viewRecord} />
      <PincodeFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setFormRecord(null);
        }}
        record={formRecord}
        onSaved={() => {
          refresh();
          onWorkflowChange?.();
          showToast(formRecord ? "Postal record updated." : "Postal record added.");
        }}
      />
      <PincodeUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onImported={(count) => {
        refresh(); onWorkflowChange?.();
        addAuditEntry({ actionType: "Postal Master Uploaded", remarks: `${count} postal record(s) imported.` });
        showToast(`${count} postal record(s) imported.`);
      }} />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      <Dialog open={!!statusConfirmTarget} onOpenChange={() => setStatusConfirmTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 border border-amber-200"><AlertTriangle className="w-4 h-4 text-amber-500" /></div>
              Change Status
            </DialogTitle>
            <DialogDescription>Change status for pincode {statusConfirmTarget?.pincode}?</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setStatusConfirmTarget(null)}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={confirmStatusToggle}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
