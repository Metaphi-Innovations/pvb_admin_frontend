"use client";

import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Edit2 } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useScheme } from "@/hooks/masters";
import { getErrorMessage } from "@/lib/masters/master-query-errors";
import {
  detailToUnifiedForm,
  schemeTypeLabel,
} from "../scheme-api-mapper";
import {
  buildSchemeWorkingSummary,
  categoryShowsImpactFlags,
} from "../scheme-unified-config";
import {
  SETTLEMENT_TYPE_LABELS,
  type SchemeSettlementType,
} from "@/services/scheme-list.service";

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  const empty =
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "string" && !value.trim());

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </p>
      <div className="text-sm text-foreground">{empty ? "—" : value}</div>
    </div>
  );
}

function asString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("toNumber" in record && typeof record.toNumber === "function") {
      try {
        return String((record.toNumber as () => number)());
      } catch {
        // fall through
      }
    }
    if ("toString" in record && typeof record.toString === "function") {
      const text = record.toString();
      if (text && text !== "[object Object]") return text;
    }
  }
  return String(value);
}

function formatDate(value: unknown): string {
  const raw = asString(value);
  if (!raw) return "—";
  return raw.slice(0, 10);
}

function formatDiscountType(value: unknown): string {
  const raw = asString(value).trim();
  if (!raw) return "";
  if (raw === "Flat" || raw === "Fixed Amount") return "Fixed Amount";
  if (raw === "Percentage") return "Percentage";
  return raw;
}

function formatDiscountValue(type: unknown, value: unknown): string {
  const raw = asString(value).trim();
  if (!raw) return "";
  const num = Number(raw);
  const formatted = Number.isFinite(num)
    ? num.toLocaleString("en-IN", { maximumFractionDigits: 4 })
    : raw;
  const discountType = asString(type);
  if (discountType === "Percentage") return `${formatted}%`;
  if (discountType === "Flat" || discountType === "Fixed Amount") {
    return `₹${formatted}`;
  }
  return formatted;
}

function formatSetup(value: unknown): string {
  const raw = asString(value);
  if (raw === "SAME_FOR_ALL_PRODUCTS") return "Same for all products";
  if (raw === "DIFFERENT_BY_PRODUCT") return "Different by product";
  return raw || "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export default function SchemeViewPageClient() {
  const router = useRouter();
  const params = useParams();
  const schemeId = String(params.id ?? "");
  const detailQuery = useScheme(schemeId);

  const detail = detailQuery.data;
  const form = useMemo(
    () => (detail ? detailToUnifiedForm(detail) : null),
    [detail],
  );

  const summary = useMemo(
    () => (form ? buildSchemeWorkingSummary(form) : ""),
    [form],
  );

  if (detailQuery.isLoading) {
    return (
      <FormContainer
        title="Scheme Details"
        description="Masters → Scheme Master"
        onBack={() => router.push("/masters/scheme")}
        compact
        noCard
      >
        <p className="text-sm text-muted-foreground px-1 py-6">Loading scheme...</p>
      </FormContainer>
    );
  }

  if (detailQuery.isError || !detail || !form) {
    return (
      <FormContainer
        title="Scheme Details"
        description="Masters → Scheme Master"
        onBack={() => router.push("/masters/scheme")}
        compact
        noCard
      >
        <p className="text-sm text-red-600 px-1 py-6">
          {getErrorMessage(detailQuery.error, "Scheme not found")}
        </p>
      </FormContainer>
    );
  }

  const settlement = asString(detail.settlement_type) as SchemeSettlementType;
  const isActive = detail.is_active === true;

  const customerTypeNames = Array.isArray(detail.customer_types)
    ? detail.customer_types.map((row) => {
        const r = row as Record<string, unknown>;
        const ct = r.customer_type as Record<string, unknown> | undefined;
        return asString(ct?.customer_type_name || r.customer_type_id);
      })
    : [];

  const customerNames = Array.isArray(detail.customers)
    ? detail.customers.map((row) => {
        const r = row as Record<string, unknown>;
        const c = r.customer as Record<string, unknown> | undefined;
        return asString(c?.customer_name || r.customer_id);
      })
    : [];

  const stateNames = Array.isArray(detail.states)
    ? detail.states.map((row) =>
        asString((row as Record<string, unknown>).state_name),
      )
    : [];

  const productNames = Array.isArray(detail.products)
    ? detail.products.map((row) => {
        const r = row as Record<string, unknown>;
        const p = r.product as Record<string, unknown> | undefined;
        return asString(p?.product_name || r.product_id);
      })
    : [];

  const slabs = Array.isArray(detail.slabs) ? detail.slabs : [];

  return (
    <FormContainer
      title={asString(detail.scheme_name) || "Scheme Details"}
      description={`${asString(detail.scheme_code)} · ${schemeTypeLabel(asString(detail.scheme_type))}`}
      onBack={() => router.push("/masters/scheme")}
      compact
      noCard
      actions={
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => router.push(`/masters/scheme/${schemeId}/edit`)}
        >
          <Edit2 className="w-3.5 h-3.5 mr-1.5" />
          Edit
        </Button>
      }
    >
      <div className="space-y-6 px-1 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Scheme Code" value={asString(detail.scheme_code)} />
          <Field
            label="Scheme Type"
            value={schemeTypeLabel(asString(detail.scheme_type))}
          />
          <Field
            label="Settlement"
            value={SETTLEMENT_TYPE_LABELS[settlement] ?? settlement}
          />
          <Field
            label="Status"
            value={
              <span
                className={cn(
                  "inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200",
                )}
              >
                {isActive ? "Active" : "Inactive"}
              </span>
            }
          />
          <Field label="Valid From" value={formatDate(detail.start_date)} />
          <Field label="Valid To" value={formatDate(detail.end_date)} />
          <Field
            label="Description"
            value={asString(detail.description) || "—"}
            className="col-span-2"
          />
        </div>

        {summary ? (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
              Working summary
            </p>
            <p className="text-sm text-foreground leading-relaxed">{summary}</p>
          </div>
        ) : null}

        <div>
          <h3 className="text-sm font-semibold mb-3">Applicability</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Customer Types"
              value={
                customerTypeNames.length
                  ? customerTypeNames.join(", ")
                  : "All customer types"
              }
            />
            <Field
              label="Customers"
              value={
                customerNames.length ? customerNames.join(", ") : "All customers"
              }
            />
            <Field
              label="States"
              value={stateNames.length ? stateNames.join(", ") : "All states"}
            />
            <Field
              label="Products"
              value={
                productNames.length ? productNames.join(", ") : "All products"
              }
            />
            {categoryShowsImpactFlags(form.schemeCategory) ? (
              <>
                <Field
                  label="Exclude from Turnover Discount"
                  value={form.excludeFromTurnoverDiscount ? "Yes" : "No"}
                />
                <Field
                  label="Exclude from Cash Discount"
                  value={form.excludeFromCashDiscount ? "Yes" : "No"}
                />
              </>
            ) : null}
          </div>
        </div>

        {form.schemeCategory === "Product Discount" ? (
          <div>
            <h3 className="text-sm font-semibold mb-3">Product Discount</h3>
            {(() => {
              const pdConfig = asRecord(detail.product_discount_config);
              const headerType = detail.discount_type;
              const headerValue = detail.discount_value;
              const setup = asString(pdConfig?.discount_setup);
              const discountType =
                pdConfig?.discount_type ?? headerType ?? form.discountType;
              const discountValue =
                pdConfig?.discount_value ?? headerValue ?? form.discountValue;
              const items = Array.isArray(detail.product_discount_items)
                ? detail.product_discount_items
                : [];

              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Field label="Setup" value={formatSetup(setup)} />
                    {setup !== "DIFFERENT_BY_PRODUCT" ? (
                      <>
                        <Field
                          label="Discount Type"
                          value={formatDiscountType(discountType)}
                        />
                        <Field
                          label="Discount Value"
                          value={formatDiscountValue(discountType, discountValue)}
                        />
                      </>
                    ) : null}
                  </div>
                  {setup === "DIFFERENT_BY_PRODUCT" && items.length > 0 ? (
                    <div className="mt-4 overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">Product</th>
                            <th className="px-3 py-2 font-medium">Type</th>
                            <th className="px-3 py-2 font-medium">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => {
                            const row = asRecord(item) ?? {};
                            const product = asRecord(row.product);
                            return (
                              <tr
                                key={asString(row.scheme_product_discount_item_id) || String(index)}
                                className="border-t"
                              >
                                <td className="px-3 py-2">
                                  {asString(
                                    product?.product_name || row.product_id,
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {formatDiscountType(row.discount_type)}
                                </td>
                                <td className="px-3 py-2">
                                  {formatDiscountValue(
                                    row.discount_type,
                                    row.discount_value,
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>
        ) : null}

        {form.schemeCategory === "Near Expiry Discount" ? (
          <div>
            <h3 className="text-sm font-semibold mb-3">Near Expiry</h3>
            {(() => {
              const neConfig = asRecord(detail.near_expiry_config);
              const discountType =
                neConfig?.discount_type ??
                detail.discount_type ??
                form.discountType;
              const discountValue =
                neConfig?.discount_value ??
                detail.discount_value ??
                form.discountValue;
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field
                    label="Expiry Within (days)"
                    value={
                      asString(neConfig?.expiry_within_days) ||
                      form.expiryWithinDays
                    }
                  />
                  <Field
                    label="Discount Type"
                    value={formatDiscountType(discountType)}
                  />
                  <Field
                    label="Discount Value"
                    value={formatDiscountValue(discountType, discountValue)}
                  />
                </div>
              );
            })()}
          </div>
        ) : null}

        {slabs.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold mb-3">Slabs</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">From</th>
                    <th className="px-3 py-2 font-medium">To</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Value</th>
                    <th className="px-3 py-2 font-medium">UOM</th>
                  </tr>
                </thead>
                <tbody>
                  {slabs.map((item, index) => {
                    const row = item as Record<string, unknown>;
                    return (
                      <tr key={asString(row.scheme_slab_id) || String(index)} className="border-t">
                        <td className="px-3 py-2">{asString(row.from_value)}</td>
                        <td className="px-3 py-2">
                          {row.to_value == null || row.to_value === ""
                            ? "Open"
                            : asString(row.to_value)}
                        </td>
                                <td className="px-3 py-2">
                                  {formatDiscountType(row.discount_type)}
                                </td>
                                <td className="px-3 py-2">
                                  {formatDiscountValue(
                                    row.discount_type,
                                    row.discount_value,
                                  )}
                                </td>
                        <td className="px-3 py-2">
                          {asString(row.uom) || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </FormContainer>
  );
}
