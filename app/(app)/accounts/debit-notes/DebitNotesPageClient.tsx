"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Download, Eye, FileSpreadsheet, MoreVertical, Pencil, PlayCircle, Plus, XCircle } from "lucide-react";
import { SectionTabs } from "../components/AccountsUI";
import { NoteWorkflowBadge } from "../components/NoteWorkflowBadge";
import { DebitNoteCancelDialog } from "./components/DebitNoteCancelDialog";
import {
  approveDebitNote,
  cancelDebitNote,
  computeDebitNoteTabCounts,
  filterDebitNotes,
  getDebitNoteRowActions,
  loadDebitNotes,
  processDebitNote,
  REFERENCE_TYPE_LABELS,
  totalRejectedQtyFromLines,
  type DebitNoteRecord,
} from "./debit-notes-data";
import { exportDebitNotesToExcel } from "./debit-notes-export";
import { downloadDebitNotePdf } from "./debit-note-pdf";
import { DEBIT_NOTES_BREADCRUMB, DEBIT_NOTES_LIST_PATH, formatINR } from "./note-utils";

const TABS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "processed", label: "Processed" },
  { id: "cancelled", label: "Cancelled" },
];

export default function DebitNotesPageClient() {
  const [records, setRecords] = useState<DebitNoteRecord[]>([]);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [vendor, setVendor] = useState("all");
  const [referenceType, setReferenceType] = useState("all");
  const [referenceNo, setReferenceNo] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cancelTarget, setCancelTarget] = useState<DebitNoteRecord | null>(null);
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(() => setRecords(loadDebitNotes()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const vendorNames = useMemo(() => [...new Set(records.map((r) => r.vendorName).filter(Boolean))].sort(), [records]);

  const visible = useMemo(
    () =>
      filterDebitNotes(records, {
        tab,
        search,
        vendor,
        referenceType,
        referenceNo,
        dateFrom,
        dateTo,
        status: statusFilter,
      }),
    [records, tab, search, vendor, referenceType, referenceNo, dateFrom, dateTo, statusFilter],
  );
  const counts = useMemo(() => computeDebitNoteTabCounts(records), [records]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportDebitNotesToExcel(visible);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[1600px] mx-auto space-y-3">
        <PageHeader
          title="Debit Notes"
          description="Supplier debits for purchase returns, short supply, and billing corrections."
          breadcrumbs={DEBIT_NOTES_BREADCRUMB}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                disabled={exporting || visible.length === 0}
                onClick={handleExport}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {exporting ? "Exporting…" : "Export Excel"}
              </Button>
              <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5" asChild>
                <Link href={`${DEBIT_NOTES_LIST_PATH}/new`}>
                  <Plus className="w-3.5 h-3.5" />
                  Create Debit Note
                </Link>
              </Button>
            </div>
          }
        />

        <SectionTabs tabs={TABS} active={tab} onChange={setTab} counts={counts} />

        <ModuleFiltersBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Debit note no., supplier, reference…">
          <Select value={vendor} onValueChange={setVendor}>
            <SelectTrigger className="h-8 w-[140px] text-xs bg-white"><SelectValue placeholder="Supplier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All suppliers</SelectItem>
              {vendorNames.map((v) => (
                <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={referenceType} onValueChange={setReferenceType}>
            <SelectTrigger className="h-8 w-[150px] text-xs bg-white"><SelectValue placeholder="Ref. type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All ref. types</SelectItem>
              <SelectItem value="purchase_invoice" className="text-xs">Purchase Invoice</SelectItem>
              <SelectItem value="purchase_order" className="text-xs">Purchase Order</SelectItem>
              <SelectItem value="standalone_adjustment" className="text-xs">Standalone</SelectItem>
            </SelectContent>
          </Select>
          <InputFilter placeholder="Reference no." value={referenceNo} onChange={setReferenceNo} />
          <InputFilter type="date" value={dateFrom} onChange={setDateFrom} className="w-[130px]" />
          <InputFilter type="date" value={dateTo} onChange={setDateTo} className="w-[130px]" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[120px] text-xs bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All statuses</SelectItem>
              <SelectItem value="draft" className="text-xs">Draft</SelectItem>
              <SelectItem value="pending_approval" className="text-xs">Pending</SelectItem>
              <SelectItem value="approved" className="text-xs">Approved</SelectItem>
              <SelectItem value="processed" className="text-xs">Processed</SelectItem>
              <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </ModuleFiltersBar>

        <div className="page-shell overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-320px)]">
            <table className="accounts-table w-full text-table min-w-[1320px]">
              <thead className="border-b">
                <tr>
                  {[
                    "Debit Note No.",
                    "Date",
                    "Supplier",
                    "Reference Type",
                    "Purchase Inv. No.",
                    "PO No.",
                    "GRN No.",
                    "QC Ref.",
                    "Rejected Qty",
                    "Debit Amount",
                    "Status",
                    "Created By",
                    "Updated By",
                    "",
                  ].map((h) => (
                    <th key={h || "a"} className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-xs text-muted-foreground">
                      No debit notes. Click Create Debit Note to add one.
                    </td>
                  </tr>
                ) : (
                  visible.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-brand-50/25">
                      <td className="px-2.5 py-2 text-xs font-mono font-medium">{r.debitNoteNo}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.debitNoteDate}</td>
                      <td className="px-2.5 py-2 text-xs">{r.vendorName}</td>
                      <td className="px-2.5 py-2 text-xs">{REFERENCE_TYPE_LABELS[r.againstType]}</td>
                      <td className="px-2.5 py-2 text-xs font-mono">{r.sourceInvoiceNo || "—"}</td>
                      <td className="px-2.5 py-2 text-xs font-mono">{r.sourcePoNo || "—"}</td>
                      <td className="px-2.5 py-2 text-xs font-mono">{r.sourceGrnNo || "—"}</td>
                      <td className="px-2.5 py-2 text-xs font-mono">{r.sourceQcNo || "—"}</td>
                      <td className="px-2.5 py-2 text-xs tabular-nums">{totalRejectedQtyFromLines(r.lineItems) || "—"}</td>
                      <td className="px-2.5 py-2 text-xs text-right font-medium tabular-nums">{formatINR(r.currentDebitAmount)}</td>
                      <td className="px-2.5 py-2"><NoteWorkflowBadge status={r.status} /></td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.createdBy}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.updatedBy}</td>
                      <td className="px-2.5 py-2 sticky right-0 bg-white">
                        <div className="flex items-center justify-end gap-0.5">
                          <Link
                            href={`${DEBIT_NOTES_LIST_PATH}/${r.id}`}
                            title="View"
                            className="p-1.5 hover:bg-muted rounded-md transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          </Link>
                          {getDebitNoteRowActions(r).includes("edit") && (
                            <Link
                              href={`${DEBIT_NOTES_LIST_PATH}/${r.id}/edit`}
                              title="Edit"
                              className="p-1.5 hover:bg-muted rounded-md transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Link>
                          )}
                          {getDebitNoteRowActions(r).some((a) => a !== "view" && a !== "edit") && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button type="button" title="More actions" className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                {getDebitNoteRowActions(r)
                                  .filter((a) => a !== "view" && a !== "edit")
                                  .map((a) => {
                              if (a === "approve")
                                return (
                                  <DropdownMenuItem
                                    key="approve"
                                    className="text-xs gap-2"
                                    onClick={() => {
                                      approveDebitNote(r.id);
                                      refresh();
                                    }}
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                                  </DropdownMenuItem>
                                );
                              if (a === "process")
                                return (
                                  <DropdownMenuItem
                                    key="process"
                                    className="text-xs gap-2"
                                    onClick={() => {
                                      processDebitNote(r.id);
                                      refresh();
                                    }}
                                  >
                                    <PlayCircle className="w-3.5 h-3.5" /> Mark Processed
                                  </DropdownMenuItem>
                                );
                              if (a === "cancel")
                                return (
                                  <DropdownMenuItem key="cancel" className="text-xs gap-2 text-red-600" onClick={() => setCancelTarget(r)}>
                                    <XCircle className="w-3.5 h-3.5" /> Cancel
                                  </DropdownMenuItem>
                                );
                              if (a === "pdf")
                                return (
                                  <DropdownMenuItem key="pdf" className="text-xs gap-2" onClick={() => downloadDebitNotePdf(r)}>
                                    <Download className="w-3.5 h-3.5" /> Download PDF
                                  </DropdownMenuItem>
                                );
                              return null;
                            })}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DebitNoteCancelDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        debitNoteNo={cancelTarget?.debitNoteNo ?? ""}
        onConfirm={(reason) => {
          if (!cancelTarget) return;
          cancelDebitNote(cancelTarget.id, reason);
          refresh();
          setCancelTarget(null);
        }}
      />
    </AppLayout>
  );
}

function InputFilter({
  placeholder,
  value,
  onChange,
  type = "text",
  className = "w-[120px]",
}: {
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-8 px-2 text-xs border border-border rounded-lg bg-white ${className}`}
    />
  );
}
