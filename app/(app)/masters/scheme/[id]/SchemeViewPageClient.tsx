"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import {
  APPROVAL_STATUS_LABELS,
  SCHEME_EFFECT_TYPE_LABELS,
  formatBenefit,
  formatValidity,
  resolveDisplayApprovalStatus,
  isSchemeEditable,
  type SchemeRecord,
} from "../scheme-data";
import {
  countProductDiscountProducts,
  countProductDiscountStates,
  formatProductDiscountOperationalStatus,
  formatSchemeRupee,
  formatStoredDiscountType,
  getProductDiscountSchemeLines,
  isProductDiscountRecord,
  loadConsolidatedSchemeRecords,
  canEditProductDiscountScheme,
} from "../product-discount-scheme";
import { SchemeApprovalBadge, SchemeStatusBadge } from "../components/SchemeBadges";
import ProductSchemeUtilizationSection from "../components/ProductSchemeUtilizationSection";

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

export default function SchemeViewPageClient() {
  const router = useRouter();
  const params = useParams();
  const schemeId = Number(params.id);
  const [record, setRecord] = useState<SchemeRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "utilization">("details");

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
  const operationalStatus = isProductDiscount
    ? formatProductDiscountOperationalStatus(record)
    : record.status === "active"
      ? "Active"
      : "Inactive";
  const canEdit = isProductDiscount
    ? canEditProductDiscountScheme(record)
    : isSchemeEditable(record);

  return (
    <FormContainer
      title={isProductDiscount ? "Product Discount Scheme" : "Scheme Details"}
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
              canEdit
                ? "Edit scheme"
                : "Approved and active schemes cannot be edited"
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
        {isProductDiscount && (
          <div className="flex gap-1 rounded-lg border border-border bg-muted/20 p-1 w-fit">
            {[
              { id: "details" as const, label: "Details" },
              { id: "utilization" as const, label: "Utilization" },
            ].map((tab) => (
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
        )}

        {(!isProductDiscount || activeTab === "details") && (
        <>
        <div className="rounded-lg border border-border bg-white px-4 py-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-foreground">{record.schemeName}</h2>
              <p className="text-[11px] text-muted-foreground">{record.schemeType}</p>
            </div>
            <div className="flex items-center gap-2">
              {isProductDiscount ? (
                <>
                  <SchemeStatusBadge active={operationalStatus === "Active"} />
                  <SchemeApprovalBadge record={record} />
                </>
              ) : (
                <SchemeApprovalBadge record={record} />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <InfoItem label="Scheme Code" value={record.schemeCode} />
            <InfoItem label="Customer Type" value={record.customerType} />
            <InfoItem label="Validity" value={formatValidity(record)} />
            {isProductDiscount ? (
              <>
                <InfoItem label="Products" value={countProductDiscountProducts(record)} />
                <InfoItem label="States" value={countProductDiscountStates(record)} />
              </>
            ) : (
              <>
                <InfoItem label="Product" value={record.productName ?? "—"} />
                <InfoItem label="State" value={record.stateName || "—"} />
                <InfoItem label="Benefit" value={formatBenefit(record)} />
              </>
            )}
            {isProductDiscount ? (
              <>
                <InfoItem label="Status" value={operationalStatus} />
                <InfoItem
                  label="Approval Status"
                  value={APPROVAL_STATUS_LABELS[resolveDisplayApprovalStatus(record)]}
                />
              </>
            ) : (
              <InfoItem
                label="Approval"
                value={APPROVAL_STATUS_LABELS[record.approvalStatus]}
              />
            )}
          </div>
        </div>

        {!isProductDiscount && (
          <div className="rounded-lg border border-border bg-white px-4 py-3">
            <p className="mb-2 text-xs font-semibold">Scheme Configuration</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <InfoItem
                label="Effect Type"
                value={record.effectType ? SCHEME_EFFECT_TYPE_LABELS[record.effectType] : "—"}
              />
              <InfoItem label="Applied In" value={record.appliedIn ?? "—"} />
              <InfoItem label="Settlement" value={record.settlementMethod ?? "—"} />
              {record.expiryWithinDays !== undefined && (
                <InfoItem label="Expiry Within Days" value={record.expiryWithinDays} />
              )}
              {record.minimumOrderValue !== undefined && (
                <InfoItem label="Min Order Value" value={`₹${record.minimumOrderValue}`} />
              )}
              {record.festivalName && <InfoItem label="Festival" value={record.festivalName} />}
              {record.paymentMode && <InfoItem label="Payment Mode" value={record.paymentMode} />}
            </div>
          </div>
        )}

        {isProductDiscount && <ProductDiscountLinesTable record={record} />}

        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold">
            Audit
          </div>
          <div className="grid grid-cols-2 gap-4 px-4 py-3 sm:grid-cols-4">
            <InfoItem label="Created By" value={record.createdBy ?? "—"} />
            <InfoItem label="Created On" value={record.createdAt ?? "—"} />
            <InfoItem label="Updated By" value={record.updatedBy ?? "—"} />
            <InfoItem label="Updated On" value={record.updatedAt ?? "—"} />
          </div>
        </div>
        </>
        )}

        {isProductDiscount && activeTab === "utilization" && (
          <ProductSchemeUtilizationSection schemeId={record.id} />
        )}
      </div>
    </FormContainer>
  );
}
