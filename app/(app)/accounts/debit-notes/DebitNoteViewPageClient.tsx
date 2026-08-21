"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import {
  canEditAccountsDocument,
} from "@/lib/accounts/accounts-maker-checker";
import { DEBIT_NOTES_BREADCRUMB, DEBIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { debitNoteImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import "../credit-notes/credit-note-workspace.css";
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
  const canPost = (status === "APPROVED" || (status === "DRAFT" && !approvalRequired) || (status === "REJECTED" && !approvalRequired)) && hasCreatePermission;
  const canCancel = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"].includes(status) && hasCreatePermission;
  const canApproveDoc = status === "PENDING_APPROVAL" && approvalRequired && hasApprovePermission;
  const canRejectDoc = status === "PENDING_APPROVAL" && approvalRequired && hasApprovePermission;
  const canReverse = status === "POSTED" && hasCreatePermission;
  const canUpdateEway = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"].includes(status) && hasUpdatePermission;

  const displayStatus = record.status;
  const isFresh = record.againstType === "standalone_adjustment";
  
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
    if (!confirm("Are you sure you want to post this Debit Note to the Ledger? This will finalize accounting entries.")) return;
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

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      showToast("Cancellation reason is required.", "error");
      return;
    }
    setActionLoading(true);
    try {
      await DebitNoteService.cancel(record.id, { reason: cancelReason });
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
      <AccountsFormLayout
        fullWidth
        title="View Debit Note"
        breadcrumb={[...DEBIT_NOTES_BREADCRUMB]}
        code={record.debitNoteNo}
        headerMeta={
          <>
            <span className={statusBadgeClass}>{displayStatus.replaceAll("_", " ")}</span>
            <span className="cn-ws__badge">
              {isFresh ? "Amount Based" : "Quantity Based"}
            </span>
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
        <div className="cn-ws">
          {/* Reversal Header Section */}
          {status === "REVERSED" && (
            <div className="bg-purple-50 border border-purple-200 rounded-md p-4 mb-4 text-xs text-purple-900">
              <h4 className="font-semibold text-[13px] mb-1">Previously Posted &amp; Subsequently Reversed</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                <div>
                  <span className="text-purple-600 block">Reversal Voucher</span>
                  <span className="font-mono font-medium">{record.reversal_voucher_number || "—"}</span>
                </div>
                <div>
                  <span className="text-purple-600 block">Reversed Date</span>
                  <span>{record.reversed_at ? new Date(record.reversed_at).toLocaleDateString() : "—"}</span>
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

          <section className="cn-ws__section">
            <p className="cn-ws__label">Basic Information</p>
            <div className="cn-ws__grid-3">
              <div className="cn-ws__field">
                <span className="cn-ws__flabel">Vendor</span>
                <p className="cn-ws__ro font-medium">{record.vendorName}</p>
              </div>
              <div className="cn-ws__field">
                <span className="cn-ws__flabel">Debit Note Date</span>
                <p className="cn-ws__ro">{record.debitNoteDate}</p>
              </div>
              <div className="cn-ws__field">
                <span className="cn-ws__flabel">Debit Note No.</span>
                <p className="cn-ws__ro font-mono">{record.debitNoteNo}</p>
              </div>
              <div className="cn-ws__field">
                <span className="cn-ws__flabel">Supplier Reference No.</span>
                <p className="cn-ws__ro">{rawRecord.remarks || "—"}</p>
              </div>
              <div className="cn-ws__field">
                <span className="cn-ws__flabel">Accounts Payable</span>
                <p className="cn-ws__ro">{record.vendorName}</p>
              </div>
              <div className="cn-ws__field">
                <span className="cn-ws__flabel">Status</span>
                <p className="cn-ws__ro capitalize">
                  {displayStatus.replaceAll("_", " ")}
                </p>
              </div>
            </div>
          </section>

          <section className="cn-ws__section">
            <p className="cn-ws__label">Debit Note Basis</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="cn-ws__badge">
                {isFresh ? "Amount Based" : "Quantity Based"}
              </span>
              <span className="cn-ws__hint">
                Source: {DEBIT_NOTE_SOURCE_LABELS[record.source]}
              </span>
            </div>
          </section>

          <section className="cn-ws__section">
            <p className="cn-ws__label">Reference Information</p>
            <div className="cn-ws__grid-4">
              <div className="cn-ws__field">
                <span className="cn-ws__flabel">Reason</span>
                <p className="cn-ws__ro">{record.reason || "—"}</p>
              </div>
              {!isFresh ? (
                <>
                  <div className="cn-ws__field">
                    <span className="cn-ws__flabel">Purchase Invoice</span>
                    <p className="cn-ws__ro font-mono">{record.sourceInvoiceNo || "—"}</p>
                  </div>
                  <div className="cn-ws__field">
                    <span className="cn-ws__flabel">Purchase Return</span>
                    <p className="cn-ws__ro font-mono">{record.sourceReturnNo || "—"}</p>
                  </div>
                </>
              ) : (
                <div className="cn-ws__field">
                  <span className="cn-ws__flabel">Adjustment Ledger</span>
                  <p className="cn-ws__ro">{record.adjustmentLedgerName || "—"}</p>
                </div>
              )}
            </div>
          </section>

          {/* Details Tabs Section */}
          <section className="mt-4">
            <Tabs defaultValue="lines" className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-9">
                <TabsTrigger value="lines" className="text-xs">Line Items</TabsTrigger>
                <TabsTrigger value="charges" className="text-xs">PR Additional Charges</TabsTrigger>
                <TabsTrigger value="refs" className="text-xs">References</TabsTrigger>
                <TabsTrigger value="journal" className="text-xs">Accounting Journal</TabsTrigger>
              </TabsList>

              <TabsContent value="lines" className="border rounded-md mt-2 overflow-x-auto bg-white">
                <table className="cn-ws__table min-w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-left">Ledger</th>
                      <th className="p-2 text-right">Quantity</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 aggression text-right">Taxable</th>
                      <th className="p-2 text-right">GST %</th>
                      <th className="p-2 text-right">GST Amount</th>
                      <th className="p-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawRecord.lines?.map((l: any) => {
                      const totalLine = parseFloat(l.taxable_amount) + parseFloat(l.cgst_amount || 0) + parseFloat(l.sgst_amount || 0) + parseFloat(l.igst_amount || 0);
                      return (
                        <tr key={l.id} className="border-b hover:bg-muted/10">
                          <td className="p-2 font-medium">{l.description || l.product_name || "—"}</td>
                          <td className="p-2">{l.ledger?.ledger_name || "—"}</td>
                          <td className="p-2 text-right">{l.quantity || "—"}</td>
                          <td className="p-2 text-right">{l.rate ? formatINR(l.rate) : "—"}</td>
                          <td className="p-2 text-right">{formatINR(l.taxable_amount)}</td>
                          <td className="p-2 text-right">{l.gst_rate}%</td>
                          <td className="p-2 text-right">{formatINR((l.cgst_amount || 0) + (l.sgst_amount || 0) + (l.igst_amount || 0))}</td>
                          <td className="p-2 text-right font-semibold">{formatINR(totalLine)}</td>
                        </tr>
                      );
                    })}
                    {(!rawRecord.lines || rawRecord.lines.length === 0) && (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-muted-foreground">No Line Items</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TabsContent>

              <TabsContent value="charges" className="border rounded-md mt-2 overflow-x-auto bg-white">
                <table className="cn-ws__table min-w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="p-2 text-left">Charge Name</th>
                      <th className="p-2 text-left">Ledger</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-right">CGST</th>
                      <th className="p-2 text-right">SGST</th>
                      <th className="p-2 text-right">IGST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawRecord.additional_charges?.map((c: any) => (
                      <tr key={c.id} className="border-b hover:bg-muted/10">
                        <td className="p-2 font-medium">{c.charge_name || "—"}</td>
                        <td className="p-2">{c.ledger_name || "—"}</td>
                        <td className="p-2 text-right">{formatINR(c.amount)}</td>
                        <td className="p-2 text-right">{formatINR(c.cgst_amount || 0)}</td>
                        <td className="p-2 text-right">{formatINR(c.sgst_amount || 0)}</td>
                        <td className="p-2 text-right">{formatINR(c.igst_amount || 0)}</td>
                      </tr>
                    ))}
                    {(!rawRecord.additional_charges || rawRecord.additional_charges.length === 0) && (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted-foreground">No Additional Charges</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TabsContent>

              <TabsContent value="refs" className="border rounded-md mt-2 overflow-x-auto bg-white">
                <table className="cn-ws__table min-w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="p-2 text-left">Reference Type</th>
                      <th className="p-2 text-left">Code / Number</th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Relation Type</th>
                      <th className="p-2 text-right">Allocated Amount</th>
                      <th className="p-2 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawRecord.references?.map((ref: any) => (
                      <tr key={ref.id} className="border-b hover:bg-muted/10">
                        <td className="p-2 font-medium">{ref.reference_type}</td>
                        <td className="p-2 font-mono">{ref.reference_code || "—"}</td>
                        <td className="p-2">{ref.reference_date || "—"}</td>
                        <td className="p-2">{ref.relation_type}</td>
                        <td className="p-2 text-right">{ref.allocated_amount ? formatINR(ref.allocated_amount) : "—"}</td>
                        <td className="p-2 text-right">{ref.quantity || "—"}</td>
                      </tr>
                    ))}
                    {(!rawRecord.references || rawRecord.references.length === 0) && (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted-foreground">No References</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TabsContent>

              <TabsContent value="journal" className="border rounded-md mt-2 overflow-x-auto bg-white p-4">
                {rawRecord.posting ? (
                  <div>
                    <h5 className="font-semibold text-xs mb-2">Accounting Journal Voucher: <span className="font-mono text-brand-700">{rawRecord.posting.voucher_number}</span></h5>
                    <p className="text-[11px] text-muted-foreground mb-4">Posted at {new Date(rawRecord.posting.posted_at).toLocaleString()} by {rawRecord.posting.posted_by_name}</p>
                    {/* Render entries list if returned by backend, else show ledger impact preview */}
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
              </TabsContent>
            </Tabs>
          </section>

          <div className="cn-ws__summary mt-6">
            <div>
              {record.activity.length > 0 ? (
                <div className="border rounded-md p-3 bg-white">
                  <p className="font-semibold text-xs mb-2">Workflow Activity Audit Log</p>
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
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No workflow activity log.</div>
              )}
            </div>
            <div className="cn-ws__summary-rows bg-white border p-4 rounded-md">
              <div>
                <span className="cn-muted">Subtotal</span>
                <span className="tabular-nums font-semibold">{formatINR(record.taxableAmount)}</span>
              </div>
              <div>
                <span className="cn-muted">CGST</span>
                <span className="tabular-nums">{formatINR(record.cgstAmount)}</span>
              </div>
              <div>
                <span className="cn-muted">SGST</span>
                <span className="tabular-nums">{formatINR(record.sgstAmount)}</span>
              </div>
              <div>
                <span className="cn-muted">IGST</span>
                <span className="tabular-nums">{formatINR(record.igstAmount)}</span>
              </div>
              {record.round_off ? (
                <div>
                  <span className="cn-muted">Round Off</span>
                  <span className="tabular-nums">{formatINR(record.round_off)}</span>
                </div>
              ) : null}
              <div className="cn-total border-t pt-2 mt-2 font-bold text-sm">
                <span>Grand Total</span>
                <span className="tabular-nums text-brand-700">
                  {formatINR(record.currentDebitAmount)}
                </span>
              </div>
            </div>
          </div>

          <section className="cn-ws__section mt-4">
            <p className="cn-ws__label">Narration &amp; Attachments</p>
            <div className="cn-ws__grid-3">
              <div className="cn-ws__field" style={{ gridColumn: "1 / -1" }}>
                <span className="cn-ws__flabel">Narration</span>
                <p className="cn-ws__ro min-h-[48px] items-start py-2">
                  {record.remarks || record.reason || "—"}
                </p>
              </div>
            </div>
          </section>
        </div>
      </AccountsFormLayout>

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
              <Label htmlFor="approver" className="text-xs">Select Approver *</Label>
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
            <Button variant="outline" size="sm" onClick={() => setSubmitOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={handleSubmit} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-red-600">Reject Debit Note</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-xs">
            <div className="grid gap-2">
              <Label htmlFor="reason" className="text-xs">Rejection Reason *</Label>
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
            <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={handleReject} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverse Modal */}
      <Dialog open={reverseOpen} onOpenChange={setReverseOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-purple-700">Reverse Posted Debit Note</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-xs">
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-[11px] text-amber-800 leading-relaxed">
              This action will reverse the posted Debit Note and generate the corresponding accounting reversal. Any applicable invoice settlement will also be unsettled. This action cannot be undone from the Debit Note screen.
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rev-reason" className="text-xs">Reversal Reason *</Label>
              <Textarea
                id="rev-reason"
                className="text-xs min-h-[70px]"
                placeholder="Enter justification for reversing this journal entry..."
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rev-date" className="text-xs">Reversal Date (Optional)</Label>
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
            <Button variant="outline" size="sm" onClick={() => setReverseOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button size="sm" className="bg-purple-700 hover:bg-purple-800 text-white" onClick={handleReverse} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Confirm Reversal
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
              <Label htmlFor="eway-no" className="text-xs">E-Way Bill Number</Label>
              <Input
                id="eway-no"
                placeholder="12-digit number"
                className="h-9 text-xs"
                value={ewayNumber}
                onChange={(e) => setEwayNumber(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="eway-dt" className="text-xs">E-Way Bill Date</Label>
              <Input
                id="eway-dt"
                type="date"
                className="h-9 text-xs"
                value={ewayDate}
                onChange={(e) => setEwayDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="eway-val" className="text-xs">Valid Upto</Label>
              <Input
                id="eway-val"
                type="date"
                className="h-9 text-xs"
                value={ewayValidity}
                onChange={(e) => setEwayValidity(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="eway-qr" className="text-xs">QR Code URL / Text</Label>
              <Input
                id="eway-qr"
                placeholder="QR code scanner content"
                className="h-9 text-xs"
                value={ewayQrCode}
                onChange={(e) => setEwayQrCode(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="eway-status" className="text-xs">E-Way Status</Label>
              <Select value={ewayStatus} onValueChange={setEwayStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERATED" className="text-xs">GENERATED</SelectItem>
                  <SelectItem value="CANCELLED" className="text-xs">CANCELLED</SelectItem>
                  <SelectItem value="EXPIRED" className="text-xs">EXPIRED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEwayOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button size="sm" className="bg-brand-600 text-white hover:bg-brand-700" onClick={handleEwaySave} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
