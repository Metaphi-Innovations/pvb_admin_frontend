"use client";

import { Sparkles } from "lucide-react";
import {
  formatBatchExpiryDate,
  formatNearExpiryBenefitLabel,
  NEAR_EXPIRY_SCHEME_STATUS_ACTIVE,
  NEAR_EXPIRY_SETTLEMENT_METHOD,
  NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING,
  NEAR_EXPIRY_SETTLEMENT_TOOLTIP,
} from "@/app/(app)/warehouse/dispatch/near-expiry-dispatch";
import { formatSchemeRupee } from "@/app/(app)/masters/scheme/product-near-expiry-scheme";
import { formatSchemeSettlementDocumentType } from "@/lib/accounts/scheme-settlement-data";
import { isSchemeSettlementPending } from "../invoices-data";
import type { DispatchNearExpirySchemeEntry } from "@/app/(app)/warehouse/dispatch/types";
import type { InvoiceNearExpirySchemeSettlement } from "../invoices-data";

type SchemeEntry = DispatchNearExpirySchemeEntry | InvoiceNearExpirySchemeSettlement;

interface InvoiceSchemeSettlementPanelProps {
  entries: SchemeEntry[];
  /** full = generate invoice screen; detail = invoice view page */
  variant?: "full" | "detail";
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-xs font-medium ${mono ? "font-mono text-brand-700" : ""}`}>{value || "—"}</p>
    </div>
  );
}

function resolveSchemeStatus(entry: SchemeEntry): string {
  if ("schemeStatus" in entry && entry.schemeStatus) return entry.schemeStatus;
  return NEAR_EXPIRY_SCHEME_STATUS_ACTIVE;
}

function resolveSettlementStatus(entry: SchemeEntry): string {
  if ("settlementStatus" in entry && entry.settlementStatus) return entry.settlementStatus;
  if ("status" in entry && entry.status) return entry.status;
  return NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING;
}

function resolveSettlementMethod(entry: SchemeEntry): string {
  if ("settlementMethod" in entry && entry.settlementMethod) return entry.settlementMethod;
  if ("settlement" in entry && entry.settlement) return entry.settlement;
  return NEAR_EXPIRY_SETTLEMENT_METHOD;
}

export function InvoiceSchemeSettlementPanel({
  entries,
  variant = "full",
}: InvoiceSchemeSettlementPanelProps) {
  if (!entries.length) return null;

  const isDetail = variant === "detail";

  return (
    <div className="rounded-lg border border-amber-200/80 bg-amber-50/30 p-4 space-y-3">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
        Scheme Settlement Information
      </h3>
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={`${entry.schemeCode}-${entry.batchNumber}-${index}`}
            className="rounded-md border border-amber-100 bg-white/60 p-3"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2.5">
              <Field label="Scheme Code" value={entry.schemeCode} mono />
              <Field label="Scheme Name" value={entry.schemeName} />
              <Field label="Scheme Type" value={entry.schemeType} />
              <Field label="Scheme Status" value={resolveSchemeStatus(entry)} />
              {!isDetail && (
                <>
                  <Field label="Product Name" value={entry.product} />
                  <Field label="Batch No." value={entry.batchNumber} mono />
                  <Field label="Expiry Date" value={formatBatchExpiryDate(entry.batchExpiryDate)} />
                  <Field label="Remaining Days" value={String(entry.remainingExpiryDays)} />
                  <Field label="Benefit Type" value={entry.benefitType} />
                  <Field
                    label="Benefit Value"
                    value={formatNearExpiryBenefitLabel(
                      entry.benefitType as "Percentage" | "Fixed Amount",
                      entry.benefitValue,
                    )}
                  />
                </>
              )}
              {isDetail && (
                <>
                  <Field label="Product" value={entry.product} />
                  <Field label="Batch" value={entry.batchNumber} mono />
                </>
              )}
              <Field
                label="Estimated Benefit Amount"
                value={formatSchemeRupee(entry.estimatedBenefitAmount)}
              />
              <Field label="Settlement Method" value={resolveSettlementMethod(entry)} />
              <Field label="Settlement Status" value={resolveSettlementStatus(entry)} />
              {isDetail &&
                !isSchemeSettlementPending(
                  "settlementStatus" in entry ? entry.settlementStatus : undefined,
                ) && (
                  <>
                    <Field
                      label="Settlement Document Type"
                      value={formatSchemeSettlementDocumentType(
                        "settlementDocumentType" in entry
                          ? entry.settlementDocumentType
                          : undefined,
                      )}
                    />
                    <Field
                      label="Settlement Document No"
                      value={
                        "settlementDocumentNo" in entry ? (entry.settlementDocumentNo ?? "") : ""
                      }
                      mono
                    />
                    <Field
                      label="Settlement Date"
                      value={"settlementDate" in entry ? (entry.settlementDate ?? "") : ""}
                    />
                    <Field
                      label="Settlement Amount"
                      value={
                        "settlementAmount" in entry && entry.settlementAmount != null
                          ? formatSchemeRupee(entry.settlementAmount)
                          : ""
                      }
                    />
                    {"settledBy" in entry && entry.settledBy ? (
                      <Field label="Settled By" value={entry.settledBy} />
                    ) : null}
                  </>
                )}
            </div>
          </div>
        ))}
      </div>
      {!isDetail && (
        <>
          <p className="text-[10px] text-muted-foreground">{NEAR_EXPIRY_SETTLEMENT_TOOLTIP}</p>
          <p className="text-[10px] text-muted-foreground">
            Informational only. Invoice value, product rates, taxable amounts, GST, and grand total are
            not modified by scheme settlement.
          </p>
        </>
      )}
    </div>
  );
}
