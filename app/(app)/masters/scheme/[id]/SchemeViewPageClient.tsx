"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import {
  formatBenefit,
  formatValidity,
  isSchemeEditable,
  SCHEME_CUSTOMER_OPTIONS,
  SCHEME_EFFECT_MAP,
  SCHEME_TYPE_DISPLAY_LABELS,
  type SchemeCategory,
  type SchemeRecord,
} from "../scheme-data";
import { formatSchemeCustomerTypes } from "../scheme-unified-config";
import {
  formatProductDiscountOperationalStatus,
  formatSchemeRupee,
  formatStoredDiscountType,
  getProductDiscountSchemeLines,
  isProductDiscountRecord,
  canEditProductDiscountScheme,
} from "../product-discount-scheme";
import {
  formatBatchExpiryDate,
  formatExpiryCriteria,
  formatNearExpiryOperationalStatus,
  formatWarehouseWithState,
  getNearExpirySchemeLines,
  isNearExpiryRecord,
  canEditNearExpiryScheme,
  loadConsolidatedSchemeRecords,
} from "../product-near-expiry-scheme";
import { SchemeApprovalBadge, SchemeStatusBadge } from "../components/SchemeBadges";
import {
  canEditStandardSchemeRecord,
  countFestiveProducts,
  formatCashBenefit,
  formatFestiveBenefit,
  formatOutstandingAgeLabel,
  formatPaymentCustomerDisplay,
  formatPaymentOfferBasis,
  formatStandardSchemeOperationalStatus,
  formatTurnoverBenefit,
  isCashRecord,
  isFestiveRecord,
  isPaymentRecord,
  isStandardSchemeRecord,
  isTurnoverRecord,
} from "../standard-schemes";
import {
  buildSchemeWorkingSummary,
  categoryShowsImpactFlags,
  enrichSchemeUnifiedConfig,
  schemeRecordToUnifiedForm,
  schemeTypeDisplayLabel,
} from "../scheme-unified-config";
import SchemeDetailMetricsCards from "../components/SchemeDetailMetricsCards";
import { getSchemeUtilizationStats } from "../scheme-analytics-data";

type SchemeViewTab = "details" | "scope";

const VIEW_TABS: { id: SchemeViewTab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "scope", label: "Products / Scope" },
];

function PaymentSettlementPreviewTable({ record }: { record: SchemeRecord }) {
  const settlementMethod =
    record.settlementMethod ??
    SCHEME_EFFECT_MAP["Payment Discount Scheme"].settlementMethod;
  const customer = formatPaymentCustomerDisplay(record);
  const waiverPct =
    record.waiverPercent !== undefined && record.waiverPercent > 0
      ? `${record.waiverPercent.toFixed(1)}%`
      : record.originalOutstandingAmount && record.waiverAmount
        ? `${((record.waiverAmount / record.originalOutstandingAmount) * 100).toFixed(1)}%`
        : "—";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-semibold">
        Settlement Preview
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 text-left font-semibold">Customer</th>
              <th className="px-3 py-2 text-right font-semibold">Original Outstanding</th>
              <th className="px-3 py-2 text-right font-semibold">Customer Payable</th>
              <th className="px-3 py-2 text-right font-semibold">Waiver Amount</th>
              <th className="px-3 py-2 text-right font-semibold">Waiver %</th>
              <th className="px-3 py-2 text-left font-semibold">Settlement Method</th>
              <th className="px-3 py-2 text-left font-semibold">Validity</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/60">
              <td className="px-3 py-2 font-medium">{customer}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {record.originalOutstandingAmount !== undefined
                  ? formatSchemeRupee(record.originalOutstandingAmount)
                  : "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {record.customerPayableAmount !== undefined
                  ? formatSchemeRupee(record.customerPayableAmount)
                  : "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {record.waiverAmount !== undefined
                  ? formatSchemeRupee(record.waiverAmount)
                  : "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{waiverPct}</td>
              <td className="px-3 py-2">{settlementMethod}</td>
              <td className="px-3 py-2 whitespace-nowrap">{formatValidity(record)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SchemeAuditLog({ record }: { record: SchemeRecord }) {
  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3">
      <p className="mb-2 text-xs font-semibold">Audit Log</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoItem label="Created By" value={record.createdBy} />
        <InfoItem label="Created Date" value={record.createdAt} />
        <InfoItem label="Updated By" value={record.updatedBy} />
        <InfoItem label="Updated Date" value={record.updatedAt} />
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}

function ProductDiscountLinesTable({ record }: { record: SchemeRecord }) {
  const lines = getProductDiscountSchemeLines(record);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-semibold">
        Scheme Lines
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 text-left font-semibold">Product Code</th>
              <th className="px-3 py-2 text-left font-semibold">Product Name</th>
              <th className="px-3 py-2 text-left font-semibold">Applicable States</th>
              <th className="px-3 py-2 text-right font-semibold">Dealer Price</th>
              <th className="px-3 py-2 text-left font-semibold">Discount Type</th>
              <th className="px-3 py-2 text-right font-semibold">Discount Value</th>
              <th className="px-3 py-2 text-right font-semibold">Discount Amount</th>
              <th className="px-3 py-2 text-right font-semibold">Final Scheme Price</th>
              <th className="px-3 py-2 text-right font-semibold">MRP</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.productId} className="border-b border-border/70 hover:bg-muted/10">
                <td className="px-3 py-2 font-mono text-[11px]">{line.productCode}</td>
                <td className="px-3 py-2 font-medium">{line.productName}</td>
                <td className="px-3 py-2">{line.stateNames.join(", ")}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatSchemeRupee(line.dealerPrice)}</td>
                <td className="px-3 py-2">{formatStoredDiscountType(line.discountType)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{line.discountValue}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {formatSchemeRupee(line.discountAmount)}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-brand-700 tabular-nums">
                  {formatSchemeRupee(line.finalSchemePrice)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatSchemeRupee(line.mrp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NearExpiryLinesTable({ record }: { record: SchemeRecord }) {
  const lines = getNearExpirySchemeLines(record);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-semibold">
        Selected Products
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 text-left font-semibold">Product Name</th>
              <th className="px-3 py-2 text-left font-semibold">SKU</th>
              <th className="px-3 py-2 text-left font-semibold">Batch No.</th>
              <th className="px-3 py-2 text-left font-semibold">Expiry Date</th>
              <th className="px-3 py-2 text-left font-semibold">Warehouse · State</th>
              <th className="px-3 py-2 text-right font-semibold">MRP</th>
              <th className="px-3 py-2 text-right font-semibold">DP</th>
              <th className="px-3 py-2 text-left font-semibold">Discount</th>
              <th className="px-3 py-2 text-right font-semibold">Amount</th>
              <th className="px-3 py-2 text-right font-semibold">Final Price</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={`${line.productId}-${line.batchNumber}`} className="border-b border-border/70 hover:bg-muted/10">
                <td className="px-3 py-2 font-medium">{line.productName}</td>
                <td className="px-3 py-2 font-mono text-[11px]">{line.sku || "—"}</td>
                <td className="px-3 py-2 font-mono text-[11px]">{line.batchNumber || "—"}</td>
                <td className="px-3 py-2">
                  {line.expiryDate ? formatBatchExpiryDate(line.expiryDate) : formatExpiryCriteria(line.expiryWithinDays)}
                </td>
                <td className="px-3 py-2">
                  {line.warehouseName
                    ? formatWarehouseWithState(line.warehouseName)
                    : line.warehouseState || "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatSchemeRupee(line.mrp)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatSchemeRupee(line.dealerPrice)}</td>
                <td className="px-3 py-2">
                  {line.benefitType === "Percentage"
                    ? `${line.benefitValue}%`
                    : formatSchemeRupee(line.benefitValue)}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums text-brand-700">
                  {formatSchemeRupee(line.benefitAmount)}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                  {formatSchemeRupee(line.finalPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SelectedStatesChips({ stateName }: { stateName: string }) {
  const states = stateName.split(",").map((s) => s.trim()).filter(Boolean);
  if (!states.length) return null;

  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3">
      <p className="mb-2 text-xs font-semibold">Selected States</p>
      <div className="flex flex-wrap gap-1.5">
        {states.map((state) => (
          <span
            key={state}
            className="inline-flex items-center gap-1 rounded bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-800"
          >
            <Check className="h-3 w-3" />
            {state}
          </span>
        ))}
      </div>
    </div>
  );
}

function TurnoverSlabsView({ record }: { record: SchemeRecord }) {
  const slabs = record.turnoverSlabs ?? [];
  if (!slabs.length) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-semibold">
        Turnover Slabs
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 text-left font-semibold">From (₹)</th>
              <th className="px-3 py-2 text-left font-semibold">To (₹)</th>
              <th className="px-3 py-2 text-left font-semibold">Benefit %</th>
            </tr>
          </thead>
          <tbody>
            {slabs.map((slab, i) => (
              <tr key={i} className="border-b border-border/70">
                <td className="px-3 py-2 tabular-nums">{formatSchemeRupee(slab.fromTurnover)}</td>
                <td className="px-3 py-2 tabular-nums">
                  {slab.toTurnover !== null ? formatSchemeRupee(slab.toTurnover) : "Above"}
                </td>
                <td className="px-3 py-2 font-medium">{slab.benefitPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StandardSchemeScopeTab({ record }: { record: SchemeRecord }) {
  if (isFestiveRecord(record)) {
    return (
      <div className="space-y-3">
        <SelectedStatesChips stateName={record.stateName} />
        <div className="rounded-lg border border-border bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold">Festive Scope</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoItem label="Campaign" value={record.festivalName ?? "—"} />
            <InfoItem label="Product Scope" value={record.productScope ?? "All"} />
            <InfoItem
              label="Products"
              value={
                record.productScope === "All"
                  ? "All products"
                  : `${countFestiveProducts(record)} selected`
              }
            />
            <InfoItem
              label="Min Order Value"
              value={
                record.minimumOrderValue !== undefined
                  ? formatSchemeRupee(record.minimumOrderValue)
                  : "—"
              }
            />
          </div>
        </div>
      </div>
    );
  }

  if (isCashRecord(record)) {
    return (
      <div className="space-y-3">
        <SelectedStatesChips stateName={record.stateName} />
        <div className="rounded-lg border border-border bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold">Cash Discount Scope</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoItem
              label="Min Order Value"
              value={
                record.minimumOrderValue !== undefined
                  ? formatSchemeRupee(record.minimumOrderValue)
                  : "—"
              }
            />
            <InfoItem label="Benefit" value={formatCashBenefit(record)} />
          </div>
        </div>
      </div>
    );
  }

  if (isTurnoverRecord(record)) {
    const customers =
      record.customerIds
        ?.map((id) => SCHEME_CUSTOMER_OPTIONS.find((c) => c.id === id)?.name ?? id)
        .join(", ") || "All matching customer type";

    return (
      <div className="space-y-3">
        <SelectedStatesChips stateName={record.stateName} />
        <div className="rounded-lg border border-border bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold">Turnover Scope</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoItem label="Turnover Period" value={record.turnoverPeriod ?? "—"} />
            <InfoItem label="Customers" value={customers} />
            <InfoItem label="Benefit" value={formatTurnoverBenefit(record)} />
          </div>
        </div>
        <TurnoverSlabsView record={record} />
      </div>
    );
  }

  if (isPaymentRecord(record)) {
    const customers =
      record.customerIds
        ?.map((id) => SCHEME_CUSTOMER_OPTIONS.find((c) => c.id === id)?.name ?? id)
        .join(", ") || "All matching customer type";

    return (
      <div className="space-y-3">
        <SelectedStatesChips stateName={record.stateName} />
        <div className="rounded-lg border border-border bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold">Outstanding Criteria</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoItem label="Customer Type" value={formatSchemeCustomerTypes(record)} />
            <InfoItem label="Specific Customer" value={customers} />
            <InfoItem
              label="Minimum Outstanding"
              value={
                record.minimumOutstandingAmount !== undefined
                  ? formatSchemeRupee(record.minimumOutstandingAmount)
                  : "—"
              }
            />
            <InfoItem
              label="Outstanding Age"
              value={formatOutstandingAgeLabel(
                record.outstandingAgeCondition,
                record.outstandingDays,
              )}
            />
          </div>
        </div>
        <PaymentSettlementPreviewTable record={record} />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-white px-4 py-8 text-center">
      <p className="text-sm font-medium text-foreground">No scope configured</p>
    </div>
  );
}

function SchemeHeaderCard({ record }: { record: SchemeRecord }) {
  const isProductDiscount = isProductDiscountRecord(record);
  const isNearExpiry = isNearExpiryRecord(record);
  const isStandard = isStandardSchemeRecord(record);
  const operationalStatus = isProductDiscount
    ? formatProductDiscountOperationalStatus(record)
    : isNearExpiry
      ? formatNearExpiryOperationalStatus(record)
      : isStandard
        ? formatStandardSchemeOperationalStatus(record)
        : record.status === "active"
          ? "Active"
          : "Inactive";

  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-foreground">{record.schemeName}</h2>
          <p className="text-[11px] text-muted-foreground">
            {record.schemeCategory
              ? schemeTypeDisplayLabel(record.schemeCategory as SchemeCategory)
              : record.schemeType}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SchemeStatusBadge active={operationalStatus === "Active"} />
          <SchemeApprovalBadge record={record} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoItem label="Scheme Code" value={record.schemeCode} />
        <InfoItem label="Customer Type" value={formatSchemeCustomerTypes(record)} />
        <InfoItem label="Validity" value={formatValidity(record)} />
        <InfoItem label="Status" value={operationalStatus} />
      </div>
    </div>
  );
}

function UnifiedConfigSummary({ record }: { record: SchemeRecord }) {
  const enriched = enrichSchemeUnifiedConfig(record);
  if (!enriched.schemeCategory && !enriched.conditionConfig && !enriched.benefitConfig) {
    return null;
  }

  const form = schemeRecordToUnifiedForm(enriched);
  const category = enriched.schemeCategory;
  const condition = enriched.conditionConfig;
  const benefit = enriched.benefitConfig;
  const summary = buildSchemeWorkingSummary(form);
  const showImpact = category ? categoryShowsImpactFlags(category) : false;

  const paymentSlabs = condition?.paymentDaySlabs;
  const turnoverSlabs = condition?.turnoverSlabs;
  const specialAmountSlabs = condition?.specialDiscountAmountSlabs;
  const specialQtySlabs = condition?.specialDiscountQuantitySlabs;
  const isSpecialDiscount = category === "Special Discount";

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-white px-4 py-3">
        <p className="mb-2 text-xs font-semibold">Scheme Details</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <InfoItem
            label="Scheme Type"
            value={
              category
                ? SCHEME_TYPE_DISPLAY_LABELS[category]
                : "—"
            }
          />
          {isSpecialDiscount && condition?.specialDiscountBasedOn ? (
            <InfoItem
              label="Based On"
              value={
                condition.specialDiscountBasedOn === "SALES_QUANTITY"
                  ? "Sales Quantity"
                  : "Sales Amount"
              }
            />
          ) : null}
          <InfoItem
            label="Products"
            value={
              condition?.productScope === "SELECTED"
                ? `${condition.productIds?.length ?? 0} selected`
                : condition?.productScope === "ALL"
                  ? "All Products"
                  : isSpecialDiscount
                    ? "All Products"
                    : "—"
            }
          />
          {isSpecialDiscount && condition?.specialDiscountUom ? (
            <InfoItem label="UOM" value={condition.specialDiscountUom} />
          ) : null}
          {!isSpecialDiscount &&
          condition?.discountType != null &&
          condition.discountValue != null ? (
            <>
              <InfoItem label="Discount Type" value={condition.discountType} />
              <InfoItem
                label="Discount Value"
                value={
                  condition.discountType === "Fixed Amount"
                    ? formatSchemeRupee(condition.discountValue)
                    : `${condition.discountValue}%`
                }
              />
            </>
          ) : null}
          {!isSpecialDiscount && condition?.applyDiscountOn ? (
            <InfoItem label="Apply Discount On" value={condition.applyDiscountOn} />
          ) : null}
          {condition?.expiryWithinDays != null && condition.expiryWithinDays > 0 ? (
            <InfoItem label="Expiry Within Days" value={condition.expiryWithinDays} />
          ) : null}
          {condition?.cashCalculationOn ? (
            <InfoItem label="Calculation On" value={condition.cashCalculationOn} />
          ) : null}
          {condition?.turnoverPeriod ? (
            <InfoItem label="Turnover Period" value={condition.turnoverPeriod} />
          ) : null}
          {condition?.turnoverCalculationOn ? (
            <InfoItem label="Calculation On" value={condition.turnoverCalculationOn} />
          ) : null}
          {condition?.paymentCondition ? (
            <InfoItem label="Payment Condition" value={condition.paymentCondition} />
          ) : null}
          {condition?.requiredPaymentPercentage != null &&
          condition.requiredPaymentPercentage > 0 ? (
            <InfoItem
              label="Required Payment %"
              value={`${condition.requiredPaymentPercentage}%`}
            />
          ) : null}
          {condition?.paymentCalculationOn ? (
            <InfoItem label="Calculation On" value={condition.paymentCalculationOn} />
          ) : null}
          <InfoItem
            label="Benefit Provided Through"
            value={benefit?.benefitThrough ?? "—"}
          />
          <InfoItem label="Benefit Given When" value={benefit?.benefitWhen ?? "—"} />
          {showImpact ? (
            <>
              <InfoItem
                label="Exclude from Turnover Discount"
                value={enriched.deductFromTurnoverBase ? "Yes" : "No"}
              />
              <InfoItem
                label="Exclude from Cash Discount"
                value={enriched.deductFromCashDiscountBase ? "Yes" : "No"}
              />
            </>
          ) : null}
        </div>
      </div>

      {paymentSlabs && paymentSlabs.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-semibold">
            Payment Day Slabs
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-[10px] uppercase text-muted-foreground">
                  <th className="px-3 py-2 text-left">From Day</th>
                  <th className="px-3 py-2 text-left">To Day</th>
                  <th className="px-3 py-2 text-right">Discount %</th>
                </tr>
              </thead>
              <tbody>
                {paymentSlabs.map((s) => (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="px-3 py-1.5 tabular-nums">{s.fromDay}</td>
                    <td className="px-3 py-1.5 tabular-nums">{s.toDay}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {s.discountPercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {turnoverSlabs && turnoverSlabs.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-semibold">
            Turnover Slabs
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-[10px] uppercase text-muted-foreground">
                  <th className="px-3 py-2 text-left">Turnover From</th>
                  <th className="px-3 py-2 text-left">Turnover To</th>
                  <th className="px-3 py-2 text-right">Discount %</th>
                </tr>
              </thead>
              <tbody>
                {turnoverSlabs.map((s) => (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="px-3 py-1.5 tabular-nums">{s.turnoverFrom}</td>
                    <td className="px-3 py-1.5 tabular-nums">
                      {s.turnoverTo == null ? "Above" : s.turnoverTo}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {s.discountPercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {specialAmountSlabs && specialAmountSlabs.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-semibold">
            Achievement Slabs (Sales Amount)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-[10px] uppercase text-muted-foreground">
                  <th className="px-3 py-2 text-left">Eligible Sales From</th>
                  <th className="px-3 py-2 text-left">Eligible Sales To</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-right">Discount</th>
                </tr>
              </thead>
              <tbody>
                {specialAmountSlabs.map((s) => (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="px-3 py-1.5 tabular-nums">
                      {formatSchemeRupee(s.eligibleSalesFrom)}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums">
                      {s.eligibleSalesTo == null
                        ? "Above"
                        : formatSchemeRupee(s.eligibleSalesTo)}
                    </td>
                    <td className="px-3 py-1.5">{s.discountType}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {s.discountType === "Fixed Amount"
                        ? formatSchemeRupee(s.discountValue)
                        : `${s.discountValue}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {specialQtySlabs && specialQtySlabs.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-semibold">
            Achievement Slabs (Sales Quantity)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-[10px] uppercase text-muted-foreground">
                  <th className="px-3 py-2 text-left">Qty From</th>
                  <th className="px-3 py-2 text-left">Qty To</th>
                  <th className="px-3 py-2 text-left">UOM</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-right">Discount</th>
                </tr>
              </thead>
              <tbody>
                {specialQtySlabs.map((s) => (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="px-3 py-1.5 tabular-nums">{s.quantityFrom}</td>
                    <td className="px-3 py-1.5 tabular-nums">
                      {s.quantityTo == null ? "Above" : s.quantityTo}
                    </td>
                    <td className="px-3 py-1.5">{s.uom || "—"}</td>
                    <td className="px-3 py-1.5">{s.discountType}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {s.discountType === "Fixed Amount"
                        ? formatSchemeRupee(s.discountValue)
                        : `${s.discountValue}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-white px-4 py-3">
        <p className="mb-1.5 text-xs font-semibold">How This Scheme Will Work</p>
        <p className="text-xs leading-relaxed text-foreground">{summary}</p>
      </div>
    </div>
  );
}

function StandardSchemeDetailsSection({ record }: { record: SchemeRecord }) {
  if (isFestiveRecord(record)) {
    return (
      <div className="space-y-3">
        <SelectedStatesChips stateName={record.stateName} />
        <div className="rounded-lg border border-border bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold">Festive Configuration</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoItem label="Campaign" value={record.festivalName ?? "—"} />
            <InfoItem label="Product Scope" value={record.productScope ?? "All"} />
            <InfoItem
              label="Products"
              value={
                record.productScope === "All"
                  ? "All products"
                  : `${countFestiveProducts(record)} selected`
              }
            />
            <InfoItem
              label="Min Order Value"
              value={
                record.minimumOrderValue !== undefined
                  ? formatSchemeRupee(record.minimumOrderValue)
                  : "—"
              }
            />
            <InfoItem label="Benefit" value={formatFestiveBenefit(record)} />
          </div>
        </div>
      </div>
    );
  }

  if (isCashRecord(record)) {
    return (
      <div className="space-y-3">
        <SelectedStatesChips stateName={record.stateName} />
        <div className="rounded-lg border border-border bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold">Cash Discount Configuration</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoItem
              label="Min Order Value"
              value={
                record.minimumOrderValue !== undefined
                  ? formatSchemeRupee(record.minimumOrderValue)
                  : "—"
              }
            />
            <InfoItem label="Benefit" value={formatCashBenefit(record)} />
          </div>
        </div>
      </div>
    );
  }

  if (isTurnoverRecord(record)) {
    return (
      <div className="space-y-3">
        <SelectedStatesChips stateName={record.stateName} />
        <div className="rounded-lg border border-border bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold">Turnover Configuration</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoItem label="Turnover Period" value={record.turnoverPeriod ?? "—"} />
            <InfoItem label="Benefit" value={formatTurnoverBenefit(record)} />
          </div>
        </div>
        <TurnoverSlabsView record={record} />
      </div>
    );
  }

  if (isPaymentRecord(record)) {
    const customers =
      record.customerIds
        ?.map((id) => SCHEME_CUSTOMER_OPTIONS.find((c) => c.id === id)?.name ?? id)
        .join(", ") || "All matching customer type";
    const settlementMethod =
      record.settlementMethod ??
      SCHEME_EFFECT_MAP["Payment Discount Scheme"].settlementMethod;
    const stats = getSchemeUtilizationStats(record);

    return (
      <div className="space-y-3">
        <SelectedStatesChips stateName={record.stateName} />

        <div className="rounded-lg border border-border bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold">Outstanding Criteria</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoItem label="Customer Type" value={formatSchemeCustomerTypes(record)} />
            <InfoItem label="Specific Customer" value={customers} />
            <InfoItem
              label="Minimum Outstanding"
              value={
                record.minimumOutstandingAmount !== undefined
                  ? formatSchemeRupee(record.minimumOutstandingAmount)
                  : "—"
              }
            />
            <InfoItem
              label="Outstanding Age"
              value={formatOutstandingAgeLabel(
                record.outstandingAgeCondition,
                record.outstandingDays,
              )}
            />
            <InfoItem
              label="Applied In"
              value={record.appliedIn ?? SCHEME_EFFECT_MAP["Payment Discount Scheme"].appliedIn}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold">Settlement Offer</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoItem label="Offer Basis" value={formatPaymentOfferBasis(record)} />
            <InfoItem
              label="Original Outstanding"
              value={
                record.originalOutstandingAmount !== undefined
                  ? formatSchemeRupee(record.originalOutstandingAmount)
                  : "—"
              }
            />
            <InfoItem
              label="Customer Payable"
              value={
                record.customerPayableAmount !== undefined
                  ? formatSchemeRupee(record.customerPayableAmount)
                  : "—"
              }
            />
            <InfoItem
              label="Waiver Amount"
              value={
                record.waiverAmount !== undefined
                  ? formatSchemeRupee(record.waiverAmount)
                  : "—"
              }
            />
            <InfoItem
              label="Waiver %"
              value={
                record.waiverPercent !== undefined ? `${record.waiverPercent.toFixed(1)}%` : "—"
              }
            />
            <InfoItem label="Settlement Method" value={settlementMethod} />
          </div>
        </div>

        <PaymentSettlementPreviewTable record={record} />

        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Analytics</p>
          <SchemeDetailMetricsCards stats={stats} />
        </div>

        <SchemeAuditLog record={record} />
      </div>
    );
  }

  return null;
}

function SchemeDetailsTab({ record }: { record: SchemeRecord }) {
  const isNearExpiry = isNearExpiryRecord(record);
  const isProductDiscount = isProductDiscountRecord(record);
  const isStandard = isStandardSchemeRecord(record);

  return (
    <div className="space-y-3">
      <SchemeHeaderCard record={record} />
      <UnifiedConfigSummary record={record} />

      {isProductDiscount && <SelectedStatesChips stateName={record.stateName} />}

      {isNearExpiry && (
        <>
          <SelectedStatesChips stateName={record.stateName} />
          <div className="rounded-lg border border-border bg-white px-4 py-3">
            <p className="mb-2 text-xs font-semibold">Near Expiry Criteria</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <InfoItem
                label="Expiry Within"
                value={
                  record.expiryWithinDays
                    ? formatExpiryCriteria(record.expiryWithinDays)
                    : "—"
                }
              />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-white px-4 py-3">
            <p className="mb-2 text-xs font-semibold">Benefit Configuration</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <InfoItem
                label="Benefit Type"
                value={
                  record.discountType === "Fixed Amount"
                    ? "Fixed Amount"
                    : "Percentage Discount"
                }
              />
              <InfoItem
                label="Benefit Value"
                value={
                  record.discountType === "Fixed Amount"
                    ? formatSchemeRupee(record.discountValue ?? 0)
                    : `${record.discountValue ?? 0}%`
                }
              />
            </div>
          </div>
        </>
      )}

      {isStandard && <StandardSchemeDetailsSection record={record} />}

      {!isProductDiscount && !isNearExpiry && !isStandard && (
        <div className="rounded-lg border border-border bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold">Scheme Configuration</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoItem label="Product" value={record.productName ?? "—"} />
            <InfoItem label="State" value={record.stateName || "—"} />
            <InfoItem label="Benefit" value={formatBenefit(record)} />
            {record.expiryWithinDays !== undefined && (
              <InfoItem label="Expiry Within Days" value={record.expiryWithinDays} />
            )}
            {record.minimumOrderValue !== undefined && (
              <InfoItem label="Min Order Value" value={formatSchemeRupee(record.minimumOrderValue)} />
            )}
            {record.festivalName && <InfoItem label="Festival" value={record.festivalName} />}
            {record.paymentMode && <InfoItem label="Payment Mode" value={record.paymentMode} />}
          </div>
        </div>
      )}
    </div>
  );
}

function SchemeScopeTab({ record }: { record: SchemeRecord }) {
  const isProductDiscount = isProductDiscountRecord(record);
  const isNearExpiry = isNearExpiryRecord(record);

  if (isProductDiscount) {
    return <ProductDiscountLinesTable record={record} />;
  }

  if (isNearExpiry) {
    return <NearExpiryLinesTable record={record} />;
  }

  if (isStandardSchemeRecord(record)) {
    if (isFestiveRecord(record) && record.productScope !== "All") {
      return <StandardSchemeScopeTab record={record} />;
    }
    if (isTurnoverRecord(record)) {
      return (
        <div className="rounded-lg border border-border bg-white px-4 py-8 text-center">
          <p className="text-sm font-medium text-foreground">Turnover slabs shown on Details tab</p>
        </div>
      );
    }
    if (isPaymentRecord(record)) {
      return <PaymentSettlementPreviewTable record={record} />;
    }
    return (
      <div className="rounded-lg border border-border bg-white px-4 py-8 text-center">
        <p className="text-sm font-medium text-foreground">No product lines for this scheme type</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Scope and benefit details are on the Details tab.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-white px-4 py-8 text-center">
      <p className="text-sm font-medium text-foreground">No product lines configured</p>
    </div>
  );
}

export default function SchemeViewPageClient() {
  const router = useRouter();
  const params = useParams();
  const schemeId = Number(params.id);
  const [record, setRecord] = useState<SchemeRecord | null>(null);
  const [activeTab, setActiveTab] = useState<SchemeViewTab>("details");

  useEffect(() => {
    const found = loadConsolidatedSchemeRecords().find((r) => r.id === schemeId);
    if (!found) {
      router.replace("/masters/scheme");
      return;
    }
    setRecord(found);
  }, [schemeId, router]);

  if (!record) {
    return (
      <FormContainer title="Scheme Details" description="Loading...">
        <p className="text-xs text-muted-foreground">Loading scheme...</p>
      </FormContainer>
    );
  }

  const isProductDiscount = isProductDiscountRecord(record);
  const isNearExpiry = isNearExpiryRecord(record);
  const isStandard = isStandardSchemeRecord(record);
  const canEdit = isProductDiscount
    ? canEditProductDiscountScheme(record)
    : isNearExpiry
      ? canEditNearExpiryScheme(record)
      : isStandard
        ? canEditStandardSchemeRecord(record)
        : isSchemeEditable(record);

  const pageTitle = isProductDiscount
    ? "Product Discount Scheme"
    : isNearExpiry
      ? "Product Near Expiry Scheme"
      : isFestiveRecord(record)
        ? "Festive Discount Scheme"
        : isCashRecord(record)
          ? "Cash Discount Scheme"
          : isTurnoverRecord(record)
            ? "Turnover Discount Scheme"
            : isPaymentRecord(record)
              ? "Payment Discount Scheme"
              : "Scheme Details";

  return (
    <FormContainer
      title={pageTitle}
      description={`Masters → Scheme Management → ${record.schemeCode}`}
      onBack={() => router.push("/masters/scheme")}
      noCard
      actions={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={canEdit ? "default" : "outline"}
            disabled={!canEdit}
            title={
              canEdit ? "Edit scheme" : "Approved and active schemes cannot be edited"
            }
            className={cn(
              "h-9 gap-1.5 rounded-lg text-xs font-semibold",
              canEdit && "bg-brand-600 text-white hover:bg-brand-700",
            )}
            onClick={() => canEdit && router.push(`/masters/scheme/${record.id}/edit`)}
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex w-fit gap-1 rounded-lg border border-border bg-muted/20 p-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={
                activeTab === tab.id
                  ? "rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm"
                  : "rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "details" && <SchemeDetailsTab record={record} />}
        {activeTab === "scope" && <SchemeScopeTab record={record} />}
      </div>
    </FormContainer>
  );
}
