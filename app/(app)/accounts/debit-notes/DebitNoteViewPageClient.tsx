"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import {
  VoucherNoteField,
  VoucherNoteFieldGrid,
  VoucherNoteReadOnly,
} from "@/components/accounts/voucher-form/VoucherNoteFieldGrid";
import {
  TransactionViewHero,
  buildVoucherViewMeta,
  voucherStatusToBadgeKey,
} from "@/components/accounts/voucher-form/TransactionViewHero";
import { DEBIT_NOTES_BREADCRUMB, DEBIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { debitNoteImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import "../credit-notes/credit-note-workspace.css";
import "@/components/accounts/voucher-form/note-form-compact.css";
import "@/components/accounts/voucher-form/transaction-view.css";
import { DebitNoteService } from "@/services/debit-note.service";
import { UserListService } from "@/services/user-list.service";
import { type DebitNoteRecord, DEBIT_NOTE_SOURCE_LABELS } from "./debit-notes-data";
import { DebitNoteCancelDialog } from "./components/DebitNoteCancelDialog";
import { showToast } from "@/lib/toast";
import { usePermissions } from "@/lib/auth/permissions-context";
import { canCreate, canEdit, canApprove } from "@/lib/auth/permissions";

// Shadcn UI components import (simple dialog implementation)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PrChargeRow = {
  id: string;
  chargeName: string;
  ledgerName: string;
  hsn: string;
  amount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
};

function resolvePrCharges(raw: Record<string, unknown> | null | undefined): PrChargeRow[] {
  if (!raw) return [];

  const additional = Array.isArray(raw.additional_charges) ? raw.additional_charges : [];
  if (additional.length > 0) {
    return additional.map((c: any, i: number) => {
      const snap = (c.charge_snapshot || {}) as Record<string, unknown>;
      return {
        id: String(c.id || c.debit_note_purchase_return_charge_allocation_id || i),
        chargeName: String(c.charge_name || c.description || snap.charge_name || "—"),
        ledgerName: String(
          c.ledger_name || c.ledger?.ledger_name || c.ledger_snapshot?.ledger_name || "—",
        ),
        hsn: String(c.hsn_code || c.hsn || c.hsn_sac || snap.hsn_code || snap.hsn || ""),
        amount: parseFloat(String(c.amount ?? c.allocated_amount ?? c.taxable_amount ?? 0)) || 0,
        gstRate: parseFloat(String(c.gst_rate ?? 0)) || 0,
        cgst: parseFloat(String(c.cgst_amount ?? 0)) || 0,
        sgst: parseFloat(String(c.sgst_amount ?? 0)) || 0,
        igst: parseFloat(String(c.igst_amount ?? 0)) || 0,
      };
    });
  }

  const allocations = Array.isArray(raw.purchase_return_charge_allocations)
    ? raw.purchase_return_charge_allocations
    : [];
  return allocations.map((a: any, i: number) => {
    const charge = a.purchase_order_return_additional_charge || {};
    const snap = (a.charge_snapshot || {}) as Record<string, unknown>;
    return {
      id: String(a.debit_note_purchase_return_charge_allocation_id || a.id || i),
      chargeName: String(charge.charge_name || snap.charge_name || "—"),
      ledgerName: String(a.ledger?.ledger_name || a.ledger_snapshot?.ledger_name || "—"),
      hsn: String(snap.hsn_code || snap.hsn || a.hsn_code || a.hsn || ""),
      amount: parseFloat(String(a.allocated_amount ?? a.amount ?? 0)) || 0,
      gstRate: parseFloat(String(a.gst_rate ?? 0)) || 0,
      cgst: parseFloat(String(a.cgst_amount ?? 0)) || 0,
      sgst: parseFloat(String(a.sgst_amount ?? 0)) || 0,
      igst: parseFloat(String(a.igst_amount ?? 0)) || 0,
    };
  });
}

export default function DebitNoteViewPageClient({ debitNoteId }: { debitNoteId: string | number }) {
  const router = useRouter();
  const { permissions } = usePermissions();

  const hasCreatePermission = canCreate(permissions, "accounts", "ledger");
  const hasUpdatePermission = canEdit(permissions, "accounts", "ledger");
  const hasApprovePermission = canApprove(permissions, "accounts", "ledger");

  const [record, setRecord] = useState<DebitNoteRecord | null>(null);
  const [rawRecord, setRawRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals visibility
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [submitOpen, setSubmitOpen] = useState(false);
  const [approvers, setApprovers] = useState<any[]>([]);
  const [selectedApproverId, setSelectedApproverId] = useState("");

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [reverseOpen, setReverseOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState("");
  const [reversalDate, setReversalDate] = useState("");

  const [ewayOpen, setEwayOpen] = useState(false);
  const [ewayNumber, setEwayNumber] = useState("");
  const [ewayDate, setEwayDate] = useState("");
  const [ewayValidity, setEwayValidity] = useState("");
  const [ewayQrCode, setEwayQrCode] = useState("");
  const [ewayStatus, setEwayStatus] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const cfg = await DebitNoteService.getConfig();
      setApprovalRequired(cfg.approval_required);

      const dn = await DebitNoteService.getById(debitNoteId);
      setRawRecord(dn);
      const { mapDebitNoteToRecord } = require("@/services/debit-note.service");
      const mapped = mapDebitNoteToRecord(dn);
      setRecord(mapped);

      // Pre-fill E-Way bill state if exists
      if (dn.eway_bill) {
        setEwayNumber(dn.eway_bill.eway_bill_number || "");
        setEwayDate(dn.eway_bill.eway_bill_date || "");
        setEwayValidity(dn.eway_bill.eway_bill_valid_upto || "");
        setEwayQrCode(dn.eway_bill.eway_bill_qr_code || "");
        setEwayStatus(dn.eway_bill.eway_bill_status || "");
      }
    } catch (e: any) {
      setError(e.message || "Failed to load Debit Note details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [debitNoteId]);

  // Load approvers list when submit dialog is opened
  useEffect(() => {
    if (submitOpen) {
      UserListService.dropdown()
        .then((users) => {
          setApprovers(users);
          if (users.length > 0) setSelectedApproverId(users[0].userId);
        })
        .catch(() => {});
    }
  }, [submitOpen]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <span className="text-xs text-muted-foreground">Loading details...</span>
      </div>
    );
  }

  if (error || !record || !rawRecord) {
    return (
      <div className="p-8 text-center text-xs text-red-600">
        {error || "Debit Note details not found."}
        <div className="mt-4">
          <Button size="sm" onClick={() => router.push(DEBIT_NOTES_LIST_PATH)}>
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  // Workflows actions mapping based on Section 30 & 78 rules
  const status = record.status.toUpperCase();
  const canEditDoc = ["DRAFT", "REJECTED"].includes(status) && hasUpdatePermission;

  const canSubmit = ["DRAFT", "REJECTED"].includes(status) && approvalRequired && hasCreatePermission;
  const canPost =
    (status === "APPROVED" ||
      (status === "DRAFT" && !approvalRequired) ||
      (status === "REJECTED" && !approvalRequired)) &&
    hasCreatePermission;
  const canCancel =
    ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"].includes(status) && hasCreatePermission;
  const canApproveDoc = status === "PENDING_APPROVAL" && approvalRequired && hasApprovePermission;
  const canRejectDoc = status === "PENDING_APPROVAL" && approvalRequired && hasApprovePermission;
  const canReverse = status === "POSTED" && hasCreatePermission;
  const canUpdateEway =
    ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"].includes(status) && hasUpdatePermission;

  const displayStatus = record.status;
  const statusLabel = displayStatus.replaceAll("_", " ");
  const isFresh = record.againstType === "standalone_adjustment";
  const sourceLabel = DEBIT_NOTE_SOURCE_LABELS[record.source] ?? record.source;
  const basisLabel = isFresh ? "Amount Based" : "Quantity Based";
  const prCharges = resolvePrCharges(rawRecord);
  const showPrHsn = prCharges.some((c) => Boolean(c.hsn));
  const interstate =
    Boolean(rawRecord?.is_interstate) ||
    (Number(record.igstAmount || 0) > 0.004 &&
      Number(record.cgstAmount || 0) < 0.004 &&
      Number(record.sgstAmount || 0) < 0.004);
  const showLineHsn = Boolean(
    rawRecord?.lines?.some(
      (l: { hsn_code?: string; hsn?: string; hsn_snapshot?: { hsn_code?: string } }) =>
        Boolean(
          l.hsn_code ||
            l.hsn ||
            l.hsn_snapshot?.hsn_code,
        ),
    ),
  );

  // Custom badges styling
  const statusBadgeClass =
    status === "POSTED"
      ? "cn-ws__badge is-posted"
      : status === "DRAFT"
        ? "cn-ws__badge is-draft"
        : status === "CANCELLED"
          ? "cn-ws__badge is-cancelled bg-red-100 text-red-800"
          : status === "REVERSED"
            ? "cn-ws__badge is-reversed bg-purple-100 text-purple-800 font-semibold"
            : "cn-ws__badge bg-blue-100 text-blue-800";

  // Actions handlers
  const handleSubmit = async () => {
    if (!selectedApproverId) {
      showToast("Please select an approver.", "error");
      return;
    }
    setActionLoading(true);
    try {
      await DebitNoteService.submit(record.id, { approver_id: selectedApproverId });
      showToast("Debit Note submitted for approval.", "success");
      setSubmitOpen(false);
      refresh();
    } catch (e: any) {
      showToast(e.message || "Failed to submit Debit Note.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm("Are you sure you want to approve this Debit Note?")) return;
    setActionLoading(true);
    try {
      await DebitNoteService.approve(record.id);
      showToast("Debit Note approved successfully.", "success");
      refresh();
    } catch (e: any) {
      showToast(e.message || "Failed to approve Debit Note.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      showToast("Rejection reason is required.", "error");
      return;
    }
    setActionLoading(true);
    try {
      await DebitNoteService.reject(record.id, { rejection_reason: rejectionReason });
      showToast("Debit Note rejected successfully.", "success");
      setRejectOpen(false);
      refresh();
    } catch (e: any) {
      showToast(e.message || "Failed to reject Debit Note.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePost = async () => {
    if (
      !confirm(
        "Are you sure you want to post this Debit Note to the Ledger? This will finalize accounting entries.",
      )
    )
      return;
    setActionLoading(true);
    try {
      const res = await DebitNoteService.post(record.id);
      if (res.approval_bypassed) {
        showToast("Debit Note posted successfully (approval bypassed).", "success");
      } else {
        showToast("Debit Note posted successfully.", "success");
      }
      refresh();
    } catch (e: any) {
      showToast(e.message || "Unable to post Debit Note.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (reasonFromDialog?: string) => {
    const reason = (reasonFromDialog ?? cancelReason).trim();
    if (!reason) {
      showToast("Cancellation reason is required.", "error");
      return;
    }
    setActionLoading(true);
    try {
      await DebitNoteService.cancel(record.id, { reason });
      showToast("Debit Note cancelled successfully.", "success");
      setCancelOpen(false);
      refresh();
    } catch (e: any) {
      showToast(e.message || "Failed to cancel Debit Note.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReverse = async () => {
    if (!reverseReason.trim()) {
      showToast("Reversal reason is required.", "error");
      return;
    }
    setActionLoading(true);
    try {
      const res = await DebitNoteService.reverse(record.id, {
        reason: reverseReason,
        reversal_date: reversalDate || undefined,
      });
      if (res.already_reversed) {
        showToast("This Debit Note was already reversed.", "info");
      } else {
        showToast("Debit Note reversed successfully.", "success");
      }
      setReverseOpen(false);
      refresh();
    } catch (e: any) {
      showToast(e.message || "Unable to reverse Debit Note.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEwaySave = async () => {
    setActionLoading(true);
    try {
      await DebitNoteService.updateEwayBill(record.id, {
        eway_bill_number: ewayNumber,
        eway_bill_date: ewayDate || undefined,
        eway_bill_valid_upto: ewayValidity || undefined,
        eway_bill_qr_code: ewayQrCode || undefined,
        eway_bill_status: ewayStatus || undefined,
      });
      showToast("E-Way Bill updated successfully.", "success");
      setEwayOpen(false);
      refresh();
    } catch (e: any) {
      showToast(e.message || "Failed to update E-Way Bill.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = () => {
    const { downloadDebitNotePdf } = require("./debit-note-pdf");
    downloadDebitNotePdf(record);
  };

  return (
    <>
      <div className="credit-debit-note-form flex-1 min-h-0 h-full flex flex-col">
        <AccountsFormLayout
          fullWidth
          title="View Debit Note"
          breadcrumb={[...DEBIT_NOTES_BREADCRUMB]}
          code={record.debitNoteNo}
          headerMeta={
            <>
              <span className={statusBadgeClass}>{statusLabel}</span>
              <span className="cn-ws__badge">{basisLabel}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {record.debitNoteNo}
              </span>
            </>
          }
          stickyFooter={
            <div className="flex items-center justify-between w-full gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => router.push(DEBIT_NOTES_LIST_PATH)}
              >
                Back
              </Button>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={handleDownload}
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </Button>
                {canEditDoc ? (
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                    onClick={() => router.push(`${DEBIT_NOTES_LIST_PATH}/${record.id}/edit`)}
                  >
                    Edit
                  </Button>
                ) : null}
                {canSubmit && (
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => setSubmitOpen(true)}
                  >
                    Submit for Approval
                  </Button>
                )}
                {canApproveDoc && (
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleApprove}
                  >
                    Approve
                  </Button>
                )}
                {canRejectDoc && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 text-xs"
                    onClick={() => setRejectOpen(true)}
                  >
                    Reject
                  </Button>
                )}
                {canPost && (
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handlePost}
                  >
                    Post to Ledger
                  </Button>
                )}
                {canUpdateEway && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setEwayOpen(true)}
                  >
                    E-Way Bill
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-red-600"
                    onClick={() => setCancelOpen(true)}
                  >
                    Cancel Voucher
                  </Button>
                )}
                {canReverse && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-purple-700 hover:bg-purple-50"
                    onClick={() => setReverseOpen(true)}
                  >
                    Reverse Voucher
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="transaction-voucher-view space-y-2 pb-4">
            {status === "REVERSED" && (
              <div className="bg-purple-50 border border-purple-200 rounded-md p-4 text-xs text-purple-900">
                <h4 className="font-semibold text-[13px] mb-1">
                  Previously Posted &amp; Subsequently Reversed
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  <div>
                    <span className="text-purple-600 block">Reversal Voucher</span>
                    <span className="font-mono font-medium">
                      {record.reversal_voucher_number || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-purple-600 block">Reversed Date</span>
                    <span>
                      {record.reversed_at
                        ? formatDisplayDate(record.reversed_at)
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-purple-600 block">Reversed By</span>
                    <span>{record.reversed_by || "—"}</span>
                  </div>
                  <div>
                    <span className="text-purple-600 block">Reason</span>
                    <span>{record.reversal_reason || "—"}</span>
                  </div>
                </div>
              </div>
            )}

            <TransactionViewHero
              statusKey={voucherStatusToBadgeKey(status)}
              statusLabel={statusLabel}
              chips={[basisLabel, sourceLabel].filter(Boolean)}
              metaItems={buildVoucherViewMeta({
                draftNo: record.debitNoteNo,
                voucherDate: record.debitNoteDate,
                branchName: record.warehouse || record.branch || undefined,
              })}
              partyLabel={record.vendorName}
              amountLabel="DN Amount"
              amount={record.currentDebitAmount}
            />

            <VoucherFormSectionCard title="Basic Information" compact highlight>
              <VoucherNoteFieldGrid columns={3}>
                <VoucherNoteField label="Vendor">
                  <VoucherNoteReadOnly>{record.vendorName}</VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Debit Note Date">
                  <VoucherNoteReadOnly>{formatDisplayDate(record.debitNoteDate)}</VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Debit Note No.">
                  <VoucherNoteReadOnly mono>{record.debitNoteNo}</VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Supplier Reference No.">
                  <VoucherNoteReadOnly>{rawRecord.remarks || "—"}</VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Accounts Payable">
                  <VoucherNoteReadOnly>{record.vendorName}</VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Status">
                  <VoucherNoteReadOnly>{statusLabel}</VoucherNoteReadOnly>
                </VoucherNoteField>
              </VoucherNoteFieldGrid>
            </VoucherFormSectionCard>

            <VoucherFormSectionCard title="Debit Note Basis" compact highlight>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center rounded-md bg-brand-50 border border-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-800">
                  {basisLabel}
                </span>
                <span className="text-muted-foreground">Source: {sourceLabel}</span>
              </div>
            </VoucherFormSectionCard>

            <VoucherFormSectionCard title="Reference Information" compact highlight>
              <VoucherNoteFieldGrid columns={4}>
                <VoucherNoteField label="Reason">
                  <VoucherNoteReadOnly>{record.reason || "—"}</VoucherNoteReadOnly>
                </VoucherNoteField>
                {!isFresh ? (
                  <>
                    <VoucherNoteField label="Purchase Invoice">
                      <VoucherNoteReadOnly mono>
                        {record.sourceInvoiceNo || "—"}
                      </VoucherNoteReadOnly>
                    </VoucherNoteField>
                    <VoucherNoteField label="Purchase Return">
                      <VoucherNoteReadOnly mono>
                        {record.sourceReturnNo || "—"}
                      </VoucherNoteReadOnly>
                    </VoucherNoteField>
                  </>
                ) : (
                  <VoucherNoteField label="Adjustment Ledger">
                    <VoucherNoteReadOnly>
                      {record.adjustmentLedgerName || "—"}
                    </VoucherNoteReadOnly>
                  </VoucherNoteField>
                )}
              </VoucherNoteFieldGrid>
            </VoucherFormSectionCard>

            <Tabs defaultValue="lines" className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-9">
                <TabsTrigger value="lines" className="text-xs">
                  Line Items
                </TabsTrigger>
                <TabsTrigger value="charges" className="text-xs">
                  PR Additional Charges
                </TabsTrigger>
                <TabsTrigger value="refs" className="text-xs">
                  References
                </TabsTrigger>
                <TabsTrigger value="journal" className="text-xs">
                  Accounting Journal
                </TabsTrigger>
              </TabsList>

              <TabsContent value="lines" className="mt-2">
                <VoucherFormSectionCard title="Line Items" compact highlight flush>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs table-fixed min-w-[920px]">
                      <colgroup>
                        <col style={{ width: "18%" }} />
                        <col style={{ width: "16%" }} />
                        {showLineHsn ? <col style={{ width: "8%" }} /> : null}
                        <col style={{ width: "8%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "11%" }} />
                        <col style={{ width: "7%" }} />
                        {interstate ? (
                          <col style={{ width: "10%" }} />
                        ) : (
                          <>
                            <col style={{ width: "9%" }} />
                            <col style={{ width: "9%" }} />
                          </>
                        )}
                        <col style={{ width: "12%" }} />
                      </colgroup>
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Description
                          </th>
                          <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Ledger
                          </th>
                          {showLineHsn ? (
                            <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              HSN
                            </th>
                          ) : null}
                          <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Quantity
                          </th>
                          <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Rate
                          </th>
                          <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Taxable
                          </th>
                          <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            GST %
                          </th>
                          {interstate ? (
                            <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              IGST
                            </th>
                          ) : (
                            <>
                              <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                CGST
                              </th>
                              <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                SGST
                              </th>
                            </>
                          )}
                          <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rawRecord.lines?.map((l: any) => {
                          const cgst = parseFloat(l.cgst_amount || 0) || 0;
                          const sgst = parseFloat(l.sgst_amount || 0) || 0;
                          const igst = parseFloat(l.igst_amount || 0) || 0;
                          const totalLine =
                            parseFloat(l.taxable_amount) + cgst + sgst + igst;
                          const hsn =
                            l.hsn_code ||
                            l.hsn ||
                            l.hsn_snapshot?.hsn_code ||
                            l.product_snapshot?.hsn_code ||
                            "";
                          return (
                            <tr key={l.id} className="border-b border-border/50 hover:bg-muted/10">
                              <td
                                className="px-2 py-1.5 font-medium truncate"
                                title={l.description || l.product_name || undefined}
                              >
                                {l.description || l.product_name || "—"}
                              </td>
                              <td
                                className="px-2 py-1.5 truncate"
                                title={l.ledger?.ledger_name || undefined}
                              >
                                {l.ledger?.ledger_name || "—"}
                              </td>
                              {showLineHsn ? (
                                <td className="px-2 py-1.5 font-mono text-muted-foreground">
                                  {hsn || "—"}
                                </td>
                              ) : null}
                              <td className="px-2 py-1.5 text-right tabular-nums">
                                {l.quantity || "—"}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums">
                                {l.rate ? formatINR(l.rate) : "—"}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums">
                                {formatINR(l.taxable_amount)}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums">
                                {l.gst_rate}%
                              </td>
                              {interstate ? (
                                <td className="px-2 py-1.5 text-right tabular-nums">
                                  {formatINR(igst)}
                                </td>
                              ) : (
                                <>
                                  <td className="px-2 py-1.5 text-right tabular-nums">
                                    {formatINR(cgst)}
                                  </td>
                                  <td className="px-2 py-1.5 text-right tabular-nums">
                                    {formatINR(sgst)}
                                  </td>
                                </>
                              )}
                              <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
                                {formatINR(totalLine)}
                              </td>
                            </tr>
                          );
                        })}
                        {(!rawRecord.lines || rawRecord.lines.length === 0) && (
                          <tr>
                            <td
                              colSpan={
                                (showLineHsn ? 1 : 0) + (interstate ? 8 : 9)
                              }
                              className="px-2 py-6 text-center text-muted-foreground"
                            >
                              No Line Items
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </VoucherFormSectionCard>
              </TabsContent>

              <TabsContent value="charges" className="mt-2">
                <VoucherFormSectionCard title="PR Additional Charges" compact highlight flush>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="px-2 py-2 text-left text-xs font-semibold">Charge Name</th>
                          <th className="px-2 py-2 text-left text-xs font-semibold">Ledger</th>
                          {showPrHsn ? (
                            <th className="px-2 py-2 text-left text-xs font-semibold">HSN</th>
                          ) : null}
                          <th className="px-2 py-2 text-right text-xs font-semibold">Amount</th>
                          <th className="px-2 py-2 text-right text-xs font-semibold">GST %</th>
                          {interstate ? (
                            <th className="px-2 py-2 text-right text-xs font-semibold">IGST</th>
                          ) : (
                            <>
                              <th className="px-2 py-2 text-right text-xs font-semibold">CGST</th>
                              <th className="px-2 py-2 text-right text-xs font-semibold">SGST</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {prCharges.map((c) => (
                          <tr key={c.id} className="border-b hover:bg-muted/10">
                            <td className="p-2 font-medium">{c.chargeName}</td>
                            <td className="p-2">{c.ledgerName}</td>
                            {showPrHsn ? (
                              <td className="p-2 font-mono">{c.hsn || "—"}</td>
                            ) : null}
                            <td className="p-2 text-right tabular-nums">
                              {formatINR(c.amount)}
                            </td>
                            <td className="p-2 text-right tabular-nums">
                              {c.gstRate > 0 ? `${c.gstRate}%` : "—"}
                            </td>
                            {interstate ? (
                              <td className="p-2 text-right tabular-nums">
                                {formatINR(c.igst)}
                              </td>
                            ) : (
                              <>
                                <td className="p-2 text-right tabular-nums">
                                  {formatINR(c.cgst)}
                                </td>
                                <td className="p-2 text-right tabular-nums">
                                  {formatINR(c.sgst)}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                        {prCharges.length === 0 && (
                          <tr>
                            <td
                              colSpan={
                                (showPrHsn ? 1 : 0) + (interstate ? 5 : 6)
                              }
                              className="p-4 text-center text-muted-foreground"
                            >
                              No Additional Charges
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </VoucherFormSectionCard>
              </TabsContent>

              <TabsContent value="refs" className="mt-2">
                <VoucherFormSectionCard title="References" compact highlight flush>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="px-2 py-2 text-left text-xs font-semibold">Reference Type</th>
                          <th className="px-2 py-2 text-left text-xs font-semibold">Code / Number</th>
                          <th className="px-2 py-2 text-left text-xs font-semibold">Date</th>
                          <th className="px-2 py-2 text-left text-xs font-semibold">Relation Type</th>
                          <th className="px-2 py-2 text-right text-xs font-semibold">Allocated Amount</th>
                          <th className="px-2 py-2 text-right text-xs font-semibold">Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rawRecord.references?.map((ref: any) => (
                          <tr key={ref.id} className="border-b hover:bg-muted/10">
                            <td className="p-2 font-medium">{ref.reference_type}</td>
                            <td className="p-2 font-mono">{ref.reference_code || "—"}</td>
                            <td className="p-2">{formatDisplayDate(ref.reference_date)}</td>
                            <td className="p-2">{ref.relation_type}</td>
                            <td className="p-2 text-right tabular-nums">
                              {ref.allocated_amount ? formatINR(ref.allocated_amount) : "—"}
                            </td>
                            <td className="p-2 text-right tabular-nums">
                              {ref.quantity || "—"}
                            </td>
                          </tr>
                        ))}
                        {(!rawRecord.references || rawRecord.references.length === 0) && (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-muted-foreground">
                              No References
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </VoucherFormSectionCard>
              </TabsContent>

              <TabsContent value="journal" className="mt-2">
                <VoucherFormSectionCard title="Accounting Journal" compact highlight>
                  {rawRecord.posting ? (
                    <div>
                      <h5 className="font-semibold text-xs mb-2">
                        Accounting Journal Voucher:{" "}
                        <span className="font-mono text-brand-700">
                          {rawRecord.posting.voucher_number}
                        </span>
                      </h5>
                      <p className="text-[11px] text-muted-foreground mb-4">
                        Posted at {new Date(rawRecord.posting.posted_at).toLocaleString()} by{" "}
                        {rawRecord.posting.posted_by_name}
                      </p>
                      <LedgerImpactPreview
                        title="Accounting Ledger Entries"
                        lines={debitNoteImpactResolved({
                          vendorName: record.vendorName,
                          taxable: record.taxableAmount,
                          taxAmount: record.gstAmount,
                          grandTotal: record.currentDebitAmount,
                          adjustmentLedgerName: record.adjustmentLedgerName,
                        })}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-xs">
                      No Posted Accounting Journal Entries Found.
                    </div>
                  )}
                </VoucherFormSectionCard>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
              <VoucherFormSectionCard title="Workflow Activity" compact highlight>
                {record.activity.length > 0 ? (
                  <div className="space-y-1.5">
                    {[...record.activity].reverse().slice(0, 8).map((a, i) => (
                      <div
                        key={`${a.at}-${i}`}
                        className="text-[11px] flex gap-3 border-b border-border/40 pb-1"
                      >
                        <span className="font-medium capitalize min-w-[7rem]">
                          {a.action.replaceAll("_", " ")}
                        </span>
                        <span className="text-muted-foreground flex-1">{a.detail}</span>
                        <span className="text-muted-foreground whitespace-nowrap">
                          {a.by} · {new Date(a.at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No workflow activity log.</p>
                )}
              </VoucherFormSectionCard>

              <VoucherFormSectionCard title="Summary" compact highlight>
                <div className="space-y-1 so-invoice-summary">
                  <div className="flex items-center justify-between gap-4 py-0.5">
                    <span className="so-summary-label">Subtotal</span>
                    <span className="so-summary-value tabular-nums font-semibold">
                      {formatINR(record.taxableAmount)}
                    </span>
                  </div>
                  {interstate ? (
                    <div className="flex items-center justify-between gap-4 py-0.5">
                      <span className="so-summary-label">IGST</span>
                      <span className="so-summary-value tabular-nums">
                        {formatINR(record.igstAmount)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-4 py-0.5">
                        <span className="so-summary-label">CGST</span>
                        <span className="so-summary-value tabular-nums">
                          {formatINR(record.cgstAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 py-0.5">
                        <span className="so-summary-label">SGST</span>
                        <span className="so-summary-value tabular-nums">
                          {formatINR(record.sgstAmount)}
                        </span>
                      </div>
                    </>
                  )}
                  {record.round_off ? (
                    <div className="flex items-center justify-between gap-4 py-0.5">
                      <span className="so-summary-label">Round Off</span>
                      <span className="so-summary-value tabular-nums">
                        {formatINR(record.round_off)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-4 py-1.5 border-t border-border/60 mt-1">
                    <span className="so-grand-total-label">Grand Total</span>
                    <span className="so-grand-total-value tabular-nums text-brand-700">
                      {formatINR(record.currentDebitAmount)}
                    </span>
                  </div>
                </div>
              </VoucherFormSectionCard>
            </div>

            <VoucherFormSectionCard title="Narration & Attachments" compact highlight>
              <div className="space-y-2">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Narration</p>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-snug">
                    {record.remarks || record.reason || "—"}
                  </p>
                </div>
                {record.attachments && record.attachments.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-0.5">
                      Attachments
                    </p>
                    <ul className="text-xs space-y-0.5">
                      {record.attachments.map((a) => (
                        <li key={a.id}>{a.fileName || a.documentName || "Attachment"}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </VoucherFormSectionCard>
          </div>
        </AccountsFormLayout>
      </div>

      {/* Cancel Modal */}
      <DebitNoteCancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        debitNoteNo={record.debitNoteNo}
        onConfirm={handleCancel}
      />

      {/* Submit Approval Modal */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Submit for Approval</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-xs">
            <div className="grid gap-2">
              <Label htmlFor="approver" className="text-xs">
                Select Approver *
              </Label>
              <Select value={selectedApproverId} onValueChange={setSelectedApproverId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select approver" />
                </SelectTrigger>
                <SelectContent>
                  {approvers.map((user) => (
                    <SelectItem key={user.userId} value={user.userId} className="text-xs">
                      {user.label} ({user.roleName || "User"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSubmitOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={handleSubmit}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-red-600">
              Reject Debit Note
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-xs">
            <div className="grid gap-2">
              <Label htmlFor="reason" className="text-xs">
                Rejection Reason *
              </Label>
              <Textarea
                id="reason"
                className="text-xs min-h-[80px]"
                placeholder="Specify reason for rejecting this document..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverse Modal */}
      <Dialog open={reverseOpen} onOpenChange={setReverseOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-purple-700">
              Reverse Posted Debit Note
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-xs">
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-[11px] text-amber-800 leading-relaxed">
              This action will reverse the posted Debit Note and generate the corresponding
              accounting reversal. Any applicable invoice settlement will also be unsettled. This
              action cannot be undone from the Debit Note screen.
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rev-reason" className="text-xs">
                Reversal Reason *
              </Label>
              <Textarea
                id="rev-reason"
                className="text-xs min-h-[70px]"
                placeholder="Enter justification for reversing this journal entry..."
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rev-date" className="text-xs">
                Reversal Date (Optional)
              </Label>
              <Input
                id="rev-date"
                type="date"
                className="h-9 text-xs"
                value={reversalDate}
                onChange={(e) => setReversalDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReverseOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-purple-700 hover:bg-purple-800 text-white"
              onClick={handleReverse}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Confirm
              Reversal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* E-Way Bill Modal */}
      <Dialog open={ewayOpen} onOpenChange={setEwayOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Update E-Way Bill Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-3 text-xs">
            <div className="grid gap-1">
              <Label htmlFor="eway-no" className="text-xs">
                E-Way Bill Number
              </Label>
              <Input
                id="eway-no"
                placeholder="12-digit number"
                className="h-9 text-xs"
                value={ewayNumber}
                onChange={(e) => setEwayNumber(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="eway-dt" className="text-xs">
                E-Way Bill Date
              </Label>
              <Input
                id="eway-dt"
                type="date"
                className="h-9 text-xs"
                value={ewayDate}
                onChange={(e) => setEwayDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="eway-val" className="text-xs">
                Valid Upto
              </Label>
              <Input
                id="eway-val"
                type="date"
                className="h-9 text-xs"
                value={ewayValidity}
                onChange={(e) => setEwayValidity(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="eway-qr" className="text-xs">
                QR Code URL / Text
              </Label>
              <Input
                id="eway-qr"
                placeholder="QR code scanner content"
                className="h-9 text-xs"
                value={ewayQrCode}
                onChange={(e) => setEwayQrCode(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="eway-status" className="text-xs">
                E-Way Status
              </Label>
              <Select value={ewayStatus} onValueChange={setEwayStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERATED" className="text-xs">
                    GENERATED
                  </SelectItem>
                  <SelectItem value="CANCELLED" className="text-xs">
                    CANCELLED
                  </SelectItem>
                  <SelectItem value="EXPIRED" className="text-xs">
                    EXPIRED
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEwayOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-brand-600 text-white hover:bg-brand-700"
              onClick={handleEwaySave}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Save
              Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
