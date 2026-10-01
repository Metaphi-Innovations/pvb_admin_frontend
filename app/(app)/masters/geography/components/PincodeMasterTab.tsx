"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Download,
  Edit2,
  Eye,
  MapPin,
  Upload,
  X,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ListingStatusToggle, isActiveStatus } from "@/components/listing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import {
  downloadPincodeSampleTemplate,
  downloadDemoPostalJson,
  getDistinctDistricts,
  getDistinctStates,
  getPincodeSummary,
  loadPincodeRecords,
  setPincodeStatus,
  type PincodeRecord,
} from "../pincode-data";
import { PincodeFormDialog } from "./PincodeFormDialog";
import { PincodeViewDialog } from "./PincodeViewDialog";
import { PincodeUploadDialog } from "./PincodeUploadDialog";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      {toast.type === "success" ? (
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 flex-shrink-0" />
      )}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  bgClass = "bg-brand-600",
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  bgClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border rounded-xl border-border">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", bgClass)}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-base font-bold leading-none text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

export function PincodeMasterTab(props: {
  onWorkflowChange?: () => void;
  onNext?: () => void;
} = {}) {
  const { onWorkflowChange, onNext } = props;
  const [records, setRecords] = useState<PincodeRecord[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "pincode", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [draftSearch, setDraftSearch] = useState("");
  const [draftState, setDraftState] = useState("");
  const [draftDistrict, setDraftDistrict] = useState("");
  const [draftStatus, setDraftStatus] = useState("");

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedState, setAppliedState] = useState("");
  const [appliedDistrict, setAppliedDistrict] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<PincodeRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<PincodeRecord | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<PincodeRecord | null>(null);

  const refresh = useCallback(() => setRecords(loadPincodeRecords()), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const summary = useMemo(() => getPincodeSummary(records), [records]);
  const stateOptions = useMemo(() => getDistinctStates(records), [records]);
  const districtOptions = useMemo(
    () => getDistinctDistricts(draftState, records),
    [draftState, records],
  );

  const filtered = useMemo(() => {
    let r = [...records];

    if (appliedSearch.trim()) {
      const q = appliedSearch.toLowerCase();
      r = r.filter(
        (row) =>
          row.pincode.includes(q) ||
          row.stateName.toLowerCase().includes(q) ||
          row.district.toLowerCase().includes(q) ||
          row.city.toLowerCase().includes(q) ||
          row.town.toLowerCase().includes(q),
      );
    }
    if (appliedState) r = r.filter((row) => row.stateName === appliedState);
    if (appliedDistrict) r = r.filter((row) => row.district === appliedDistrict);
    if (appliedStatus) r = r.filter((row) => row.status === appliedStatus);

    if (sort.key && sort.direction !== "none") {
      r.sort((a, b) => {
        const av = String(a[sort.key as keyof PincodeRecord] ?? "");
        const bv = String(b[sort.key as keyof PincodeRecord] ?? "");
        const c = av.localeCompare(bv);
        return sort.direction === "asc" ? c : -c;
      });
    }
    return r;
  }, [records, appliedSearch, appliedState, appliedDistrict, appliedStatus, sort]);

  useEffect(() => {
    setPage(1);
  }, [appliedSearch, appliedState, appliedDistrict, appliedStatus, sort, pageSize]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const applyFilters = () => {
    setAppliedSearch(draftSearch);
    setAppliedState(draftState);
    setAppliedDistrict(draftDistrict);
    setAppliedStatus(draftStatus);
    setFilters({
      search: draftSearch,
      stateName: draftState,
      district: draftDistrict,
      status: draftStatus,
    });
  };

  const resetFilters = () => {
    setDraftSearch("");
    setDraftState("");
    setDraftDistrict("");
    setDraftStatus("");
    setAppliedSearch("");
    setAppliedState("");
    setAppliedDistrict("");
    setAppliedStatus("");
    setFilters({});
  };

  const requestStatusToggle = useCallback((row: PincodeRecord) => {
    setStatusConfirmTarget(row);
  }, []);

  const confirmStatusToggle = useCallback(() => {
    if (!statusConfirmTarget) return;
    const nextActive = statusConfirmTarget.status !== "active";
    setPincodeStatus(statusConfirmTarget.id, nextActive ? "active" : "inactive");
    setStatusConfirmTarget(null);
    refresh();
    showToast(`Record ${nextActive ? "activated" : "deactivated"} successfully.`);
  }, [statusConfirmTarget, refresh, showToast]);

  const actions = useMemo<ActionItemConfig<PincodeRecord>[]>(
    () => [
      {
        label: "View",
        action: "view",
        icon: Eye,
        onClick: (row) => setViewRecord(row),
      },
      {
        label: "Edit",
        action: "edit",
        icon: Edit2,
        onClick: (row) => {
          setEditRecord(row);
          setFormOpen(true);
        },
      },
    ],
    [],
  );

  const columns = useMemo<ColumnConfig<PincodeRecord>[]>(
    () => [
      {
        key: "pincode",
        header: "Pincode",
        sortable: true,
        width: "100px",
        render: (val) => <span className="font-mono text-xs font-semibold">{val}</span>,
      },
      {
        key: "stateName",
        header: "State",
        sortable: true,
        render: (val) => <span className="text-xs">{val}</span>,
      },
      {
        key: "district",
        header: "District",
        sortable: true,
        render: (val) => <span className="text-xs">{val}</span>,
      },
      {
        key: "city",
        header: "City",
        sortable: true,
        render: (val) => <span className="text-xs">{val}</span>,
      },
      {
        key: "town",
        header: "Town",
        sortable: true,
        render: (val) => <span className="text-xs font-medium">{val}</span>,
      },
      {
        key: "status",
        header: "Status",
        width: "120px",
        render: (_val, row) => (
          <ListingStatusToggle
            active={isActiveStatus(row.status)}
            onChange={() => requestStatusToggle(row)}
          />
        ),
      },
      {
        key: "createdBy",
        header: "Created By",
        render: (val) => <span className="text-xs">{val}</span>,
      },
      {
        key: "createdDate",
        header: "Created Date",
        sortable: true,
        render: (val) => <span className="text-xs font-mono">{val}</span>,
      },
      {
        key: "updatedBy",
        header: "Updated By",
        render: (val) => <span className="text-xs">{val}</span>,
      },
      {
        key: "updatedDate",
        header: "Updated Date",
        sortable: true,
        render: (val) => <span className="text-xs font-mono">{val}</span>,
      },
    ],
    [requestStatusToggle],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Pincode Master</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Step 1 — Import India Post postal data (CSV, XLSX, or JSON). This feeds Coverage Mapping downstream.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload India Post Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={downloadPincodeSampleTemplate}
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV Sample
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={downloadDemoPostalJson}
          >
            <Download className="w-3.5 h-3.5" />
            Download Demo JSON
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <KpiCard label="Total Records" value={summary.total} icon={MapPin} bgClass="bg-brand-600" />
        <KpiCard label="Active Records" value={summary.active} icon={CheckCircle2} bgClass="bg-emerald-600" />
        <KpiCard label="Inactive Records" value={summary.inactive} icon={XCircle} bgClass="bg-slate-400" />
        <KpiCard label="States Covered" value={summary.statesCovered} icon={MapPin} bgClass="bg-teal-600" />
        <KpiCard label="Districts Covered" value={summary.districtsCovered} icon={MapPin} bgClass="bg-indigo-600" />
        <KpiCard label="Upload Errors" value={summary.uploadErrors} icon={XCircle} bgClass="bg-amber-600" />
      </div>

      <div className="rounded-xl border border-border bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Search</Label>
            <Input
              className="h-9 text-sm"
              placeholder="Search by pincode, state, district, city, or town…"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">State</Label>
            <Select
              value={draftState || "__all__"}
              onValueChange={(v) => {
                setDraftState(v === "__all__" ? "" : v);
                setDraftDistrict("");
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">
                  All States
                </SelectItem>
                {stateOptions.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">District</Label>
            <Select
              value={draftDistrict || "__all__"}
              onValueChange={(v) => setDraftDistrict(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">
                  All Districts
                </SelectItem>
                {districtOptions.map((d) => (
                  <SelectItem key={d} value={d} className="text-xs">
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select
              value={draftStatus || "__all__"}
              onValueChange={(v) => setDraftStatus(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">
                  All Statuses
                </SelectItem>
                <SelectItem value="active" className="text-xs">
                  Active
                </SelectItem>
                <SelectItem value="inactive" className="text-xs">
                  Inactive
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={applyFilters}
          >
            Search
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={resetFilters}>
            Reset Filters
          </Button>
        </div>
      </div>

      <MasterListing<PincodeRecord>
        columns={columns}
        data={paginated}
        totalRecords={filtered.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={setSort}
        onFilterChange={(f) => {
          setFilters(f);
          const s = (f.search as string) || "";
          setAppliedSearch(s);
          setDraftSearch(s);
        }}
        onAdd={() => {
          setEditRecord(null);
          setFormOpen(true);
        }}
        addLabel="Add Pincode"
        emptyMessage="pincode records"
        searchPlaceholder="Search pincode, state, district, city, town…"
        currentFilters={filters}
        currentSort={sort}
        actions={actions}
      />

      <PincodeFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditRecord(null);
        }}
        record={editRecord}
        onSaved={() => {
          refresh();
          showToast(editRecord ? "Pincode record updated." : "Pincode record added.");
        }}
      />

      <PincodeViewDialog
        open={!!viewRecord}
        onClose={() => setViewRecord(null)}
        record={viewRecord}
        onEdit={() => {
          if (!viewRecord) return;
          setEditRecord(viewRecord);
          setViewRecord(null);
          setFormOpen(true);
        }}
      />

      <PincodeUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onImported={(count) => {
          refresh();
          onWorkflowChange?.();
          showToast(`${count} pincode record(s) imported successfully.`);
        }}
      />

      {onNext && (
        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={onNext}
          >
            Continue to Geography Setup →
          </Button>
        </div>
      )}

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      <Dialog open={!!statusConfirmTarget} onOpenChange={() => setStatusConfirmTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              Change Status
            </DialogTitle>
            <DialogDescription className="pt-1">
              Are you sure you want to change the status of this pincode record?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setStatusConfirmTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={confirmStatusToggle}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
