"use client";

/**
 * Scheme Claim Review — settlement review workbench + Phase 3 Generate Credit Note.
 */

import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { cn } from "@/lib/utils";
import { formatINR, CREDIT_NOTES_BREADCRUMB, CREDIT_NOTES_LIST_PATH } from "./note-utils";
import {
  approveSchemeEntitlement,
  getSchemeEntitlementById,
  rejectSchemeEntitlement,
  sendBackSchemeEntitlement,
  type SchemeEntitlement,
  type SchemeEntitlementInvoiceBreakdown,
} from "@/lib/accounts/scheme-entitlement-demo";
import {
  formatClaimDisplay,
  getEntitlementCalculationType,
  getEntitlementClaimNumber,
  getEntitlementExcludedRecords,
  getEntitlementIncludedRecords,
  groupIncludedRecordsByInvoice,
  type SchemeCalculationType,
} from "@/lib/accounts/scheme-claim-types";
import {
  resolveEntitlementCreditNoteNavigation,
  resolveSchemeEntitlementLedger,
  SCHEME_ENTITLEMENT_LEDGER_ERROR,
} from "@/lib/accounts/scheme-entitlement-credit-note";
import "./scheme-claim-review-workbench.css";

type DocType = "Sales Invoice" | "Sales Return" | "Credit Note";
type BreakdownFilter = "all" | "included" | "excluded";

/** Display-only document type — does not mutate entitlement data. */
function resolveDocumentType(row: SchemeEntitlementInvoiceBreakdown): DocType {
  const no = row.invoiceNo.toUpperCase();
  const scheme = (row.appliedSchemeName || "").toLowerCase();
  const reason = (row.exclusionReason || "").toLowerCase();
  if (
    scheme.includes("sales return") ||
    reason.includes("sales return") ||
    no.includes("CN-SR") ||
    /^SR[-/]/.test(no)
  ) {
    return "Sales Return";
  }
  if (
    (no.startsWith("CN-") || no.includes("/CN/") || scheme.includes("credit note")) &&
    !no.includes("CN-SR")
  ) {
    return "Credit Note";
  }
  return "Sales Invoice";
}

/**
 * Display-level arithmetic consistency check only.
 * Does not recalculate eligibility rules or overwrite ERP values.
 */
function validateEntitlementArithmetic(record: SchemeEntitlement): {
  ok: boolean;
  expectedBase: number;
  expectedBenefit: number;
  totalExclusions: number;
} {
  const totalExclusions =
    record.salesReturnAdjustment +
    record.cancelledInvoiceAdjustment +
    record.excludedSchemeAmount +
    record.otherExclusionAmount;
  const expectedBase =
    Math.round((record.grossEligibleAmount - totalExclusions) * 100) / 100;
  const expectedBenefit =
    record.discountType === "Percentage"
      ? Math.round(expectedBase * (record.discountRate / 100) * 100) / 100
      : Math.round(record.discountRate * 100) / 100;
  const baseOk = Math.abs(expectedBase - record.eligibleBaseAmount) < 0.02;
  const benefitOk = Math.abs(expectedBenefit - record.calculatedBenefit) < 0.02;
  return { ok: baseOk && benefitOk, expectedBase, expectedBenefit, totalExclusions };
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "Approved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Sent Back":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Rejected":
      return "bg-red-50 text-red-700 border-red-200";
    case "Pending Review":
      return "bg-navy-50 text-navy-700 border-navy-200";
    case "Credit Note Generated":
      return "bg-teal-50 text-teal-700 border-teal-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function workflowStepState(
  status: SchemeEntitlement["status"],
  step: 1 | 2 | 3 | 4,
): "done" | "current" | "pending" {
  if (status === "Rejected" || status === "Cancelled" || status === "Expired") {
    if (step === 1) return "done";
    if (step === 2) return "current";
    return "pending";
  }
  if (status === "Credit Note Generated") {
    if (step <= 3) return "done";
    return "current";
  }
  if (status === "Approved") {
    if (step <= 2) return "done";
    if (step === 3) return "done";
    return "current";
  }
  if (status === "Pending Review" || status === "Sent Back") {
    if (step === 1) return "done";
    if (step === 2) return "current";
    return "pending";
  }
  if (step === 1) return "done";
  return "pending";
}

function formatActionLabel(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function refValue(
  refs: SchemeEntitlement["supportingReferences"],
  ...labels: string[]
): string {
  for (const label of labels) {
    const hit = refs.find((r) => r.label.toLowerCase() === label.toLowerCase());
    if (hit?.value) return hit.value;
  }
  return "";
}

function RuleAppliedGrid({
  calcType,
  rule,
  record,
}: {
  calcType: SchemeCalculationType;
  rule: NonNullable<SchemeEntitlement["ruleApplied"]>;
  record: SchemeEntitlement;
}) {
  const fields: { label: string; value: string }[] = [];

  if (calcType === "QUANTITY_BASED") {
    fields.push(
      { label: "Target Quantity", value: formatClaimDisplay(rule.targetQuantity) },
      { label: "Achieved Quantity", value: formatClaimDisplay(rule.achievedQuantity) },
      { label: "Eligible Quantity", value: formatClaimDisplay(rule.eligibleQuantity) },
      { label: "UOM", value: formatClaimDisplay(rule.uom) },
      { label: "Applied Rate or Benefit", value: formatClaimDisplay(rule.appliedRate) },
      { label: "Calculation Basis", value: formatClaimDisplay(rule.calculationBasis) },
    );
  } else if (calcType === "TURNOVER_BASED") {
    fields.push(
      { label: "Eligible Turnover", value: formatINR(rule.eligibleTurnover ?? record.eligibleBaseAmount) },
      { label: "Applicable Slab", value: formatClaimDisplay(rule.appliedSlab ?? record.appliedSlab) },
      { label: "Applied Rate", value: formatClaimDisplay(rule.appliedRate) },
      {
        label: "Excluded Turnover",
        value:
          rule.excludedTurnover != null
            ? formatINR(rule.excludedTurnover)
            : EM_DASH,
      },
      { label: "Exclusion Reason", value: formatClaimDisplay(rule.exclusionReason) },
    );
  } else if (calcType === "PAYMENT_BASED") {
    fields.push(
      { label: "Required Payment Period", value: formatClaimDisplay(rule.requiredPaymentDays != null ? `${rule.requiredPaymentDays} days` : undefined) },
      { label: "Invoice Date", value: formatClaimDisplay(rule.invoiceDate) },
      { label: "Due Date", value: formatClaimDisplay(rule.dueDate) },
      { label: "Receipt Date", value: formatClaimDisplay(rule.receiptDate) },
      { label: "Receipt Number", value: formatClaimDisplay(rule.receiptNumber) },
      { label: "Actual Payment Days", value: formatClaimDisplay(rule.actualPaymentDays) },
      {
        label: "Eligible Paid Amount",
        value:
          rule.eligiblePaidAmount != null
            ? formatINR(rule.eligiblePaidAmount)
            : EM_DASH,
      },
      { label: "Applied Rate", value: formatClaimDisplay(rule.appliedRate) },
      { label: "Payment Status", value: formatClaimDisplay(rule.paymentStatus) },
    );
  } else if (calcType === "NEAR_EXPIRY") {
    fields.push(
      {
        label: "Configured Expiry Window",
        value: formatClaimDisplay(
          rule.configuredExpiryWindowDays != null
            ? `${rule.configuredExpiryWindowDays} days`
            : undefined,
        ),
      },
      { label: "Eligible Invoice Line Count", value: formatClaimDisplay(rule.eligibleLineCount) },
      { label: "Eligible Quantity", value: formatClaimDisplay(rule.eligibleQuantity) },
      {
        label: "Eligible Taxable Value",
        value:
          rule.eligibleTaxableValue != null
            ? formatINR(rule.eligibleTaxableValue)
            : EM_DASH,
      },
      { label: "Applied Rate", value: formatClaimDisplay(rule.appliedRate) },
      { label: "Reference Date", value: formatClaimDisplay(rule.referenceDate) },
    );
  } else {
    fields.push(
      {
        label: "Scheme Validity Period",
        value: formatClaimDisplay(
          rule.schemeValidityStart && rule.schemeValidityEnd
            ? `${rule.schemeValidityStart} – ${rule.schemeValidityEnd}`
            : `${record.periodStart} – ${record.periodEnd}`,
        ),
      },
      {
        label: "Eligible Transaction Period",
        value: formatClaimDisplay(
          rule.eligibleTransactionStart && rule.eligibleTransactionEnd
            ? `${rule.eligibleTransactionStart} – ${rule.eligibleTransactionEnd}`
            : undefined,
        ),
      },
      {
        label: "Eligible Value or Quantity",
        value: formatINR(record.eligibleBaseAmount),
      },
      { label: "Applied Rate or Fixed Benefit", value: formatClaimDisplay(rule.appliedRate) },
    );
  }

  return (
    <div className="scr-info__grid">
      {fields.map((f) => (
        <div key={f.label} className="scr-info__field">
          <label>{f.label}</label>
          <p>{f.value}</p>
        </div>
      ))}
    </div>
  );
}

const EM_DASH = "—";

export default function SchemeClaimReviewPageClient({ entitlementId }: { entitlementId: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<SchemeEntitlement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reasonDialog, setReasonDialog] = useState<"send_back" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [breakdownFilter, setBreakdownFilter] = useState<BreakdownFilter>("all");
  const [supportingOpen, setSupportingOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(null);

  const refresh = useCallback(() => {
    const ent = getSchemeEntitlementById(entitlementId);
    if (!ent) {
      router.replace(CREDIT_NOTES_LIST_PATH);
      return;
    }
    setRecord(ent);
  }, [entitlementId, router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const included = useMemo(
    () => (record?.invoiceBreakdown ?? []).filter((b) => b.includedInCalculation),
    [record],
  );
  const excluded = useMemo(
    () => (record?.invoiceBreakdown ?? []).filter((b) => !b.includedInCalculation),
    [record],
  );

  const salesReturnRows = useMemo(
    () => excluded.filter((b) => resolveDocumentType(b) === "Sales Return"),
    [excluded],
  );
  const excludedSchemeRows = useMemo(
    () => excluded.filter((b) => resolveDocumentType(b) !== "Sales Return"),
    [excluded],
  );

  const filteredBreakdown = useMemo(() => {
    const rows = record?.invoiceBreakdown ?? [];
    if (breakdownFilter === "included") return rows.filter((b) => b.includedInCalculation);
    if (breakdownFilter === "excluded") return rows.filter((b) => !b.includedInCalculation);
    return rows;
  }, [record, breakdownFilter]);

  const arithmetic = useMemo(
    () => (record ? validateEntitlementArithmetic(record) : null),
    [record],
  );

  const calculationType = useMemo(
    () => (record ? getEntitlementCalculationType(record) : "PERIOD_PROMOTIONAL"),
    [record],
  );

  const includedRecords = useMemo(
    () => (record ? getEntitlementIncludedRecords(record) : []),
    [record],
  );

  const excludedRecords = useMemo(
    () => (record ? getEntitlementExcludedRecords(record) : []),
    [record],
  );

  const invoiceSummaries = useMemo(
    () => groupIncludedRecordsByInvoice(includedRecords),
    [includedRecords],
  );

  const hasLineLevelRecords = useMemo(
    () => includedRecords.some((r) => Boolean(r.invoiceLineId)),
    [includedRecords],
  );

  if (!record || !arithmetic) return null;

  const canReviewActions =
    record.status === "Pending Review" || record.status === "Sent Back";
  const canSendBack =
    record.status === "Pending Review" || record.status === "Approved";
  const canReject =
    record.status === "Pending Review" ||
    record.status === "Sent Back" ||
    record.status === "Approved";
  const canGenerate = record.status === "Approved";
  const isGenerated = record.status === "Credit Note Generated";
  const approveDisabled = !canReviewActions || !arithmetic.ok;
  const mappedLedgerOk = Boolean(resolveSchemeEntitlementLedger(record));

  const schemeRateLabel =
    record.discountType === "Percentage"
      ? `${record.discountRate}%`
      : formatINR(record.discountRate);

  const periodLabel = `${record.periodStart} – ${record.periodEnd} (${record.periodReference})`;
  const settlementLabel =
    record.settlementPeriodStart && record.settlementPeriodEnd
      ? `${record.settlementPeriodStart} – ${record.settlementPeriodEnd}`
      : EM_DASH;
  const claimNumber = getEntitlementClaimNumber(record);
  const mappedLedgerLabel = record.mappedLedgerName?.trim() || EM_DASH;

  const runApprove = () => {
    if (!arithmetic.ok) return;
    setError(null);
    setSuccess(null);
    try {
      const next = approveSchemeEntitlement(record.id);
      setRecord(next);
      setSuccess("Claim approved. You can now Generate Credit Note.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not approve claim.");
    }
  };

  const runGenerateCreditNote = () => {
    setError(null);
    setSuccess(null);
    if (!mappedLedgerOk) {
      setError(SCHEME_ENTITLEMENT_LEDGER_ERROR);
      return;
    }
    const nav = resolveEntitlementCreditNoteNavigation(record.id);
    if (nav.kind === "open_draft") {
      setSuccess(`Opening existing draft ${nav.creditNoteNo}.`);
      router.push(nav.href);
      return;
    }
    if (nav.kind === "open_existing") {
      setSuccess(`Credit Note ${nav.creditNoteNo} already exists.`);
      router.push(nav.href);
      return;
    }
    router.push(nav.href);
  };

  const submitReason = () => {
    setError(null);
    setSuccess(null);
    try {
      if (reasonDialog === "send_back") {
        const next = sendBackSchemeEntitlement(record.id, reason);
        setRecord(next);
        setSuccess("Claim sent back for recalculation.");
      } else if (reasonDialog === "reject") {
        const next = rejectSchemeEntitlement(record.id, reason);
        setRecord(next);
        setSuccess("Claim rejected.");
      }
      setReasonDialog(null);
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    }
  };

  const workflowSteps: { step: 1 | 2 | 3 | 4; label: string }[] = [
    { step: 1, label: "ERP Eligibility Created" },
    { step: 2, label: "Accounts Review" },
    { step: 3, label: "Approval" },
    { step: 4, label: "Credit Note Generation" },
  ];

  return (
    <AccountsPageShell
      layout="form"
      breadcrumbs={[
        ...CREDIT_NOTES_BREADCRUMB,
        { label: "Pending", href: CREDIT_NOTES_LIST_PATH },
        { label: record.schemeCode },
      ]}
      title=""
      description=""
      hideDescription
      className="scheme-claim-review-shell"
    >
      <div className="scheme-claim-review-workbench">
        {/* 1. Compact header */}
        <header className="scr-header">
          <div className="scr-header__left">
            <Link
              href={CREDIT_NOTES_LIST_PATH}
              className="scr-back"
              aria-label="Back to Pending"
              title="Back to Pending"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <div className="min-w-0">
              <h1 className="scr-header__title">Scheme Claim Review</h1>
              <div className="scr-header__meta">
                <span>
                  <span className="scr-code">{record.schemeCode}</span>
                </span>
                <span>
                  <strong>{record.schemeName}</strong>
                </span>
                <span>
                  Customer: <strong>{record.customerName}</strong>
                </span>
                <span>
                  Period: <strong>{periodLabel}</strong>
                </span>
              </div>
            </div>
          </div>
          <div className="scr-header__right">
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                statusBadgeClass(record.status),
              )}
            >
              {record.status}
            </span>
            {canSendBack && !isGenerated && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => {
                  setReason("");
                  setReasonDialog("send_back");
                }}
              >
                Send Back
              </Button>
            )}
            {canReject && !isGenerated && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => {
                  setReason("");
                  setReasonDialog("reject");
                }}
              >
                Reject
              </Button>
            )}
            {canReviewActions && (
              <Button
                size="sm"
                className="h-7 text-xs px-2.5 bg-brand-600 hover:bg-brand-700 text-white"
                onClick={runApprove}
                disabled={approveDisabled}
                title={
                  !arithmetic.ok
                    ? "Approve disabled — calculation mismatch"
                    : undefined
                }
              >
                Approve
              </Button>
            )}
            {canGenerate && (
              <Button
                size="sm"
                className="h-7 text-xs px-2.5 bg-brand-600 hover:bg-brand-700 text-white"
                onClick={runGenerateCreditNote}
                disabled={!mappedLedgerOk}
                title={
                  !mappedLedgerOk
                    ? SCHEME_ENTITLEMENT_LEDGER_ERROR
                    : "Generate Credit Note from this entitlement"
                }
              >
                Generate Credit Note
              </Button>
            )}
            {isGenerated && record.generatedCreditNoteId != null && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2.5"
                onClick={() =>
                  router.push(
                    `${CREDIT_NOTES_LIST_PATH}/${record.generatedCreditNoteId}`,
                  )
                }
              >
                View Credit Note
              </Button>
            )}
          </div>
        </header>

        {/* Workflow strip */}
        <div className="scr-workflow" aria-label="Review workflow">
          <span className="scr-workflow__label">Workflow</span>
          {workflowSteps.map((s) => {
            const state = workflowStepState(record.status, s.step);
            return (
              <span
                key={s.step}
                className={cn(
                  "scr-workflow__step",
                  state === "done" && "is-done",
                  state === "current" && "is-current",
                  state === "pending" && "is-pending",
                )}
              >
                <span className="scr-workflow__num">{s.step}.</span>
                {s.label}
              </span>
            );
          })}
        </div>

        {error && <div className="scr-alert scr-alert--error">{error}</div>}
        {success && <div className="scr-alert scr-alert--success">{success}</div>}
        {canGenerate && !mappedLedgerOk ? (
          <div className="scr-alert scr-alert--error">{SCHEME_ENTITLEMENT_LEDGER_ERROR}</div>
        ) : null}
        {record.status === "Sent Back" && record.sendBackReason ? (
          <div className="scr-alert scr-alert--info">
            Sent back reason: {record.sendBackReason}
          </div>
        ) : null}
        {record.status === "Rejected" && record.rejectReason ? (
          <div className="scr-alert scr-alert--error">
            Rejected reason: {record.rejectReason}
          </div>
        ) : null}
        {isGenerated ? (
          <section className="scr-section">
            <div className="scr-section__head">
              <h2 className="scr-section__title">Credit Note Generated</h2>
            </div>
            <div className="scr-collapse-body">
              <div className="scr-info__grid">
                <div className="scr-info__field">
                  <label>Credit Note No.</label>
                  <p className="font-mono font-semibold">
                    {record.generatedCreditNoteNo || "—"}
                  </p>
                </div>
                <div className="scr-info__field">
                  <label>Credit Note Status</label>
                  <p>{record.generatedCreditNoteStatus || "—"}</p>
                </div>
                <div className="scr-info__field">
                  <label>Generated By</label>
                  <p>{record.generatedBy || "—"}</p>
                </div>
                <div className="scr-info__field">
                  <label>Generated At</label>
                  <p>
                    {record.generatedAt
                      ? new Date(record.generatedAt).toLocaleString()
                      : "—"}
                  </p>
                </div>
              </div>
              {record.generatedCreditNoteId != null ? (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() =>
                      router.push(
                        `${CREDIT_NOTES_LIST_PATH}/${record.generatedCreditNoteId}`,
                      )
                    }
                  >
                    View Credit Note
                  </Button>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
        {!arithmetic.ok ? (
          <div className="scr-warn" role="alert">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Calculation mismatch — review ERP entitlement data. Approve is disabled until
              values reconcile.
            </span>
          </div>
        ) : null}

        {/* 2. KPI strip */}
        <div className="scr-kpi">
          <div className="scr-kpi__item">
            <p className="scr-kpi__label">Gross Eligible Sales</p>
            <p className="scr-kpi__value">{formatINR(record.grossEligibleAmount)}</p>
          </div>
          <div className="scr-kpi__item">
            <p className="scr-kpi__label">Total Exclusions</p>
            <p className="scr-kpi__value">{formatINR(arithmetic.totalExclusions)}</p>
          </div>
          <div className="scr-kpi__item">
            <p className="scr-kpi__label">Final Eligible Base</p>
            <p className="scr-kpi__value">{formatINR(record.eligibleBaseAmount)}</p>
          </div>
          <div className="scr-kpi__item">
            <p className="scr-kpi__label">Scheme Rate</p>
            <p className="scr-kpi__value">{schemeRateLabel}</p>
          </div>
          <div className="scr-kpi__item is-emphasis">
            <p className="scr-kpi__label">Credit Note Amount</p>
            <p className="scr-kpi__value">{formatINR(record.calculatedBenefit)}</p>
          </div>
        </div>

        {/* 3. Claim information */}
        <section className="scr-info">
          <div className="scr-info__grid">
            <div className="scr-info__field">
              <label>Claim Number</label>
              <p className="font-mono text-brand-700">{claimNumber}</p>
            </div>
            <div className="scr-info__field">
              <label>Customer</label>
              <p>{record.customerName}</p>
            </div>
            <div className="scr-info__field">
              <label>Customer Code</label>
              <p className="font-mono">{record.customerCode?.trim() || EM_DASH}</p>
            </div>
            <div className="scr-info__field">
              <label>Customer Type</label>
              <p>{record.customerType || EM_DASH}</p>
            </div>
            <div className="scr-info__field">
              <label>State</label>
              <p>{record.state || EM_DASH}</p>
            </div>
            <div className="scr-info__field">
              <label>Scheme Name</label>
              <p>{record.schemeName}</p>
            </div>
            <div className="scr-info__field">
              <label>Scheme Type</label>
              <p>{record.schemeType}</p>
            </div>
            <div className="scr-info__field">
              <label>Scheme Code</label>
              <p className="font-mono text-brand-700">{record.schemeCode}</p>
            </div>
            <div className="scr-info__field">
              <label>Scheme Period</label>
              <p>{periodLabel}</p>
            </div>
            <div className="scr-info__field">
              <label>Settlement Period</label>
              <p>{settlementLabel}</p>
            </div>
            <div className="scr-info__field">
              <label>Claim Status</label>
              <p>{record.status}</p>
            </div>
            <div className="scr-info__field">
              <label>Calculated Benefit</label>
              <p>{formatINR(record.calculatedBenefit)}</p>
            </div>
            <div className="scr-info__field">
              <label>Credit Note Amount</label>
              <p>{formatINR(record.creditNoteAmount ?? record.calculatedBenefit)}</p>
            </div>
            <div className="scr-info__field">
              <label>Mapped Adjustment Ledger</label>
              <p>{mappedLedgerLabel}</p>
            </div>
            <div className="scr-info__field">
              <label>GST Treatment</label>
              <p>{record.gstTreatment || EM_DASH}</p>
            </div>
            <div className="scr-info__field">
              <label>Created Date</label>
              <p>{record.createdAt ? new Date(record.createdAt).toLocaleDateString() : EM_DASH}</p>
            </div>
            <div className="scr-info__field">
              <label>Calculation Basis</label>
              <p>{record.calculationBasis || EM_DASH}</p>
            </div>
            <div className="scr-info__field">
              <label>Discount Type</label>
              <p>{record.discountType}</p>
            </div>
          </div>
        </section>

        {/* Scheme Rule Applied */}
        {record.ruleApplied ? (
          <section className="scr-section">
            <div className="scr-section__head">
              <h2 className="scr-section__title">Scheme Rule Applied</h2>
            </div>
            <RuleAppliedGrid
              calcType={calculationType}
              rule={record.ruleApplied}
              record={record}
            />
          </section>
        ) : null}

        {/* Included Records — line-level when available */}
        {hasLineLevelRecords ? (
          <section className="scr-section">
            <div className="scr-section__head">
              <h2 className="scr-section__title">Included Records</h2>
              <div className="scr-chips">
                <span className="scr-chip scr-chip--included">
                  Invoices: {invoiceSummaries.length}
                </span>
                <span className="scr-chip scr-chip--included">
                  Eligible Lines: {includedRecords.length}
                </span>
              </div>
            </div>
            <div className="scr-table-wrap">
              <table className="scr-table">
                <thead>
                  <tr>
                    <th className="w-8" />
                    <th>Invoice Number</th>
                    <th>Invoice Date</th>
                    <th className="text-right">Total Lines</th>
                    <th className="text-right">Eligible Lines</th>
                    <th className="text-right">Eligible Qty</th>
                    <th className="text-right">Eligible Taxable</th>
                    <th className="text-right">Calculated Benefit</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceSummaries.map((inv) => {
                    const expanded = expandedInvoiceId === inv.invoiceId;
                    return (
                      <Fragment key={`inv-${inv.invoiceId}`}>
                        <tr>
                          <td>
                            <button
                              type="button"
                              className="p-0.5 hover:bg-muted rounded"
                              onClick={() =>
                                setExpandedInvoiceId(expanded ? null : inv.invoiceId)
                              }
                              aria-expanded={expanded}
                            >
                              {expanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                          <td>
                            <span className="scr-doc">{inv.invoiceNumber}</span>
                          </td>
                          <td className="scr-num">{inv.invoiceDate}</td>
                          <td className="text-right scr-num">{inv.totalLines}</td>
                          <td className="text-right scr-num">{inv.eligibleLines}</td>
                          <td className="text-right scr-num">{inv.eligibleQuantity}</td>
                          <td className="text-right scr-num">
                            {formatINR(inv.eligibleTaxableValue)}
                          </td>
                          <td className="text-right scr-num">
                            {formatINR(
                              inv.calculatedBenefit > 0
                                ? inv.calculatedBenefit
                                : record.calculatedBenefit *
                                    (inv.eligibleTaxableValue / record.eligibleBaseAmount),
                            )}
                          </td>
                        </tr>
                        {expanded
                          ? inv.lines.map((line) => (
                              <tr
                                key={`${line.invoiceLineId ?? line.productName}`}
                                className="bg-muted/10"
                              >
                                <td />
                                <td colSpan={2} className="text-muted-foreground">
                                  {line.productName || EM_DASH}
                                  {line.batchNumber ? ` · ${line.batchNumber}` : ""}
                                </td>
                                <td className="text-right scr-num">
                                  {line.invoicedQuantity ?? EM_DASH}
                                </td>
                                <td className="text-right scr-num">
                                  {line.eligibleQuantity ?? EM_DASH}
                                </td>
                                <td className="text-right scr-num">{line.uom || EM_DASH}</td>
                                <td className="text-right scr-num">
                                  {formatINR(line.taxableValue)}
                                </td>
                                <td className="text-right scr-num">
                                  {line.calculatedBenefit != null
                                    ? formatINR(line.calculatedBenefit)
                                    : EM_DASH}
                                </td>
                              </tr>
                            ))
                          : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* Excluded Records */}
        {excludedRecords.length > 0 ? (
          <section className="scr-section">
            <div className="scr-section__head">
              <h2 className="scr-section__title">Excluded Records</h2>
              <span className="scr-chip scr-chip--excluded">
                {excludedRecords.length} excluded
              </span>
            </div>
            <div className="scr-table-wrap">
              <table className="scr-table">
                <thead>
                  <tr>
                    <th>Invoice Number</th>
                    <th>Product</th>
                    <th>Batch</th>
                    <th className="text-right">Quantity</th>
                    <th>Exclusion Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {excludedRecords.map((row, i) => (
                    <tr key={`${row.invoiceNumber ?? i}-${row.productName ?? i}`}>
                      <td>
                        <span className="scr-doc">{row.invoiceNumber || EM_DASH}</span>
                      </td>
                      <td>{row.productName || EM_DASH}</td>
                      <td>{row.batchNumber || EM_DASH}</td>
                      <td className="text-right scr-num">
                        {row.quantity != null
                          ? `${row.quantity}${row.uom ? ` ${row.uom}` : ""}`
                          : EM_DASH}
                      </td>
                      <td className="text-muted-foreground whitespace-normal max-w-[280px]">
                        {row.exclusionReason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* 4. Full-width Calculation Reconciliation */}
        <section className="scr-section">
          <div className="scr-section__head">
            <h2 className="scr-section__title">Calculation Reconciliation</h2>
          </div>
          <table className="scr-recon">
            <thead>
              <tr>
                <th scope="col">Particulars</th>
                <th scope="col" className="scr-amt">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Gross Eligible Sales</td>
                <td className="scr-amt">{formatINR(record.grossEligibleAmount)}</td>
              </tr>
              <tr className="scr-less">
                <td>Less: Sales Returns</td>
                <td className="scr-amt">{formatINR(record.salesReturnAdjustment)}</td>
              </tr>
              <tr className="scr-less">
                <td>Less: Cancelled Invoices</td>
                <td className="scr-amt">{formatINR(record.cancelledInvoiceAdjustment)}</td>
              </tr>
              <tr className="scr-less">
                <td>Less: Excluded Scheme Sales</td>
                <td className="scr-amt">{formatINR(record.excludedSchemeAmount)}</td>
              </tr>
              <tr className="scr-less">
                <td>Less: Other Exclusions</td>
                <td className="scr-amt">{formatINR(record.otherExclusionAmount)}</td>
              </tr>
              <tr className="scr-divider scr-base">
                <td>Final Eligible Base</td>
                <td className="scr-amt">{formatINR(record.eligibleBaseAmount)}</td>
              </tr>
              <tr>
                <td>Scheme Rate</td>
                <td className="scr-amt">{schemeRateLabel}</td>
              </tr>
              <tr className="scr-result">
                <td>Calculated Credit Note Amount</td>
                <td className="scr-amt">{formatINR(record.calculatedBenefit)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 5–6. Invoice Breakdown + filter tabs */}
        <section className="scr-section">
          <div className="scr-section__head">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h2 className="scr-section__title">Invoice Breakdown</h2>
              <div className="scr-chips">
                <span className="scr-chip scr-chip--included">Included: {included.length}</span>
                <span className="scr-chip scr-chip--excluded">Excluded: {excluded.length}</span>
              </div>
            </div>
            <div className="scr-tabs" role="tablist" aria-label="Breakdown filter">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "included", label: "Included" },
                  { id: "excluded", label: "Excluded" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={breakdownFilter === tab.id}
                  className={cn("scr-tab", breakdownFilter === tab.id && "is-active")}
                  onClick={() => setBreakdownFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="scr-table-wrap">
            <table className="scr-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Document No.</th>
                  <th>Document Type</th>
                  <th className="text-right">Taxable Value</th>
                  <th>Applied Scheme</th>
                  <th>Treatment</th>
                  <th>Exclusion Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      No documents in this view.
                    </td>
                  </tr>
                ) : (
                  filteredBreakdown.map((row) => {
                    const docType = resolveDocumentType(row);
                    return (
                      <tr key={`${row.invoiceNo}-${row.invoiceId}`}>
                        <td className="scr-num">{row.invoiceDate}</td>
                        <td>
                          <span className="scr-doc">{row.invoiceNo}</span>
                        </td>
                        <td>
                          <span
                            className={cn(
                              "scr-badge",
                              docType === "Sales Return"
                                ? "scr-badge--doc-return"
                                : docType === "Credit Note"
                                  ? "scr-badge--doc-cn"
                                  : "scr-badge--doc",
                            )}
                          >
                            {docType}
                          </span>
                        </td>
                        <td className="text-right scr-num">{formatINR(row.taxableValue)}</td>
                        <td className="max-w-[160px]">
                          {row.appliedSchemeName?.trim() &&
                          resolveDocumentType(row) !== "Sales Return"
                            ? row.appliedSchemeName
                            : "—"}
                        </td>
                        <td>
                          <span
                            className={cn(
                              "scr-badge",
                              row.includedInCalculation
                                ? "scr-badge--included"
                                : "scr-badge--excluded",
                            )}
                          >
                            {row.includedInCalculation ? "Included" : "Excluded"}
                          </span>
                        </td>
                        <td className="text-muted-foreground whitespace-normal max-w-[280px]">
                          {row.exclusionReason?.trim() || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 7. Supporting Details — collapsed by default */}
        <section className="scr-section">
          <button
            type="button"
            className="scr-collapse-trigger"
            onClick={() => setSupportingOpen((o) => !o)}
            aria-expanded={supportingOpen}
          >
            <span>Supporting Details</span>
            {supportingOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
          {supportingOpen ? (
            <div className="scr-collapse-body">
              {record.schemeType === "Turnover Discount" ? (
                <div className="scr-info__grid">
                  <div className="scr-info__field">
                    <label>Scheme Period</label>
                    <p>
                      {refValue(record.supportingReferences, "Scheme Period") || periodLabel}
                    </p>
                  </div>
                  <div className="scr-info__field">
                    <label>Included Invoice Count</label>
                    <p>{included.length}</p>
                  </div>
                  <div className="scr-info__field">
                    <label>Excluded Scheme Invoices</label>
                    <p>{excludedSchemeRows.length}</p>
                  </div>
                  <div className="scr-info__field">
                    <label>Sales Return Adjustments</label>
                    <p>{salesReturnRows.length}</p>
                  </div>
                  <div className="scr-info__field">
                    <label>Sales Return Adjustment</label>
                    <p>{formatINR(record.salesReturnAdjustment)}</p>
                  </div>
                  <div className="scr-info__field">
                    <label>Net Eligible Turnover</label>
                    <p>
                      {refValue(record.supportingReferences, "Net Eligible Turnover") ||
                        formatINR(record.eligibleBaseAmount)}
                    </p>
                  </div>
                </div>
              ) : record.schemeType === "Near Expiry Discount" ? (
                <div className="scr-info__grid">
                  <div className="scr-info__field">
                    <label>Invoice</label>
                    <p>{refValue(record.supportingReferences, "Invoice") || "—"}</p>
                  </div>
                  <div className="scr-info__field">
                    <label>Product</label>
                    <p>{refValue(record.supportingReferences, "Product") || "—"}</p>
                  </div>
                  <div className="scr-info__field">
                    <label>Batch</label>
                    <p>{refValue(record.supportingReferences, "Batch") || "—"}</p>
                  </div>
                  <div className="scr-info__field">
                    <label>Expiry Date</label>
                    <p>{refValue(record.supportingReferences, "Expiry Date") || "—"}</p>
                  </div>
                  <div className="scr-info__field">
                    <label>Remaining Days</label>
                    <p>
                      {refValue(
                        record.supportingReferences,
                        "Remaining Days",
                        "Remaining Shelf-life (days)",
                      ) || "—"}
                    </p>
                  </div>
                  <div className="scr-info__field">
                    <label>Applicable Slab</label>
                    <p>
                      {refValue(record.supportingReferences, "Applicable Slab") ||
                        `${schemeRateLabel} near-expiry slab`}
                    </p>
                  </div>
                </div>
              ) : record.schemeType === "Cash Discount" ? (
                <div className="scr-info__grid">
                  <div className="scr-info__field">
                    <label>Invoice</label>
                    <p>{refValue(record.supportingReferences, "Invoice") || "—"}</p>
                  </div>
                  <div className="scr-info__field">
                    <label>Receipt Voucher</label>
                    <p>{refValue(record.supportingReferences, "Receipt Voucher") || "—"}</p>
                  </div>
                  <div className="scr-info__field">
                    <label>Due Date</label>
                    <p>{refValue(record.supportingReferences, "Due Date") || "—"}</p>
                  </div>
                  <div className="scr-info__field">
                    <label>Receipt Date</label>
                    <p>{refValue(record.supportingReferences, "Receipt Date") || "—"}</p>
                  </div>
                  <div className="scr-info__field">
                    <label>Days Paid Early</label>
                    <p>{refValue(record.supportingReferences, "Days Paid Early") || "—"}</p>
                  </div>
                  <div className="scr-info__field">
                    <label>Settled Amount</label>
                    <p>
                      {refValue(
                        record.supportingReferences,
                        "Settled Amount",
                        "Amount Settled",
                      ) || formatINR(record.eligibleBaseAmount)}
                    </p>
                  </div>
                </div>
              ) : record.supportingReferences.length > 0 ? (
                <div className="scr-info__grid">
                  {record.supportingReferences.map((ref) => (
                    <div key={ref.label} className="scr-info__field">
                      <label>{ref.label}</label>
                      <p>{ref.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">No supporting details.</p>
              )}
            </div>
          ) : null}
        </section>

        {/* 9. Audit History — collapsed by default */}
        {record.actionLog.length > 0 ? (
          <section className="scr-section">
            <button
              type="button"
              className="scr-collapse-trigger"
              onClick={() => setAuditOpen((o) => !o)}
              aria-expanded={auditOpen}
            >
              <span>Audit History</span>
              {auditOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            {auditOpen ? (
              <div className="scr-collapse-body">
                <div className="scr-audit-row text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  <span>Action</span>
                  <span>Actor</span>
                  <span>Date & Time</span>
                  <span>Reason</span>
                </div>
                {record.actionLog.map((log, i) => (
                  <div key={`${log.at}-${i}`} className="scr-audit-row">
                    <span className="font-medium text-foreground">
                      {formatActionLabel(log.action)}
                    </span>
                    <span>{log.actor}</span>
                    <span className="tabular-nums">{new Date(log.at).toLocaleString()}</span>
                    <span className="text-muted-foreground">{log.reason || "—"}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <Dialog open={reasonDialog != null} onOpenChange={(o) => !o && setReasonDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {reasonDialog === "send_back" ? "Send Back for Recalculation" : "Reject Claim"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              A reason is mandatory. This updates the claim status only — no Credit Note is
              created.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              className="min-h-[80px] text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason…"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setReasonDialog(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className={cn(
                "h-8 text-xs text-white",
                reasonDialog === "reject"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-brand-600 hover:bg-brand-700",
              )}
              onClick={submitReason}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AccountsPageShell>
  );
}
