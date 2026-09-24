"use client";

import type { ReactNode } from "react";
import { formatMoneyString, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import type {
  Gstr3bBucket,
  Gstr3bItcBreakup,
  Gstr3bSupportStatus,
  Gstr3bWorkingResult,
} from "@/types/gst-summary.types";

const NA = "Not Available";
const NA_SHORT = "—";
const NOT_YET = "Not Yet Supported";
const NOT_V1 = "Not Implemented in V1";

function supportLabel(support: Gstr3bSupportStatus): string | null {
  switch (support) {
    case "PARTIAL":
      return "Partial support";
    case "NOT_AVAILABLE":
      return NA;
    case "NOT_IMPLEMENTED_IN_V1":
      return NOT_V1;
    default:
      return null;
  }
}

function SupportBadge({ support }: { support: Gstr3bSupportStatus }) {
  const label = supportLabel(support);
  if (!label || support === "SUPPORTED") return null;
  const tone =
    support === "PARTIAL"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : support === "NOT_IMPLEMENTED_IN_V1"
        ? "bg-slate-50 text-slate-600 border-slate-200"
        : "bg-muted/40 text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
        tone,
      )}
    >
      {label}
    </span>
  );
}

function moneyOrUnavailable(
  value: string | null | undefined,
  support?: Gstr3bSupportStatus,
): string {
  if (
    support === "NOT_AVAILABLE" ||
    support === "NOT_IMPLEMENTED_IN_V1"
  ) {
    return NA_SHORT;
  }
  if (value == null || value === "") return NA_SHORT;
  return formatMoneyString(value);
}

function MoneyCell({
  value,
  support,
  className,
}: {
  value: string | null | undefined;
  support?: Gstr3bSupportStatus;
  className?: string;
}) {
  const display = moneyOrUnavailable(value, support);
  const isNa = display === NA_SHORT || display === NA;
  return (
    <td
      className={cn(
        "px-2 py-1.5 text-right text-[11px] tabular-nums",
        isNa ? "text-muted-foreground" : MONEY_AMOUNT_CLASS,
        className,
      )}
    >
      {display}
    </td>
  );
}

function SectionCard({
  title,
  support,
  reason,
  children,
  accent,
}: {
  title: string;
  support?: Gstr3bSupportStatus;
  reason?: string | null;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm overflow-hidden",
        accent && "border-amber-200/80",
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-3 py-2">
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        {support ? <SupportBadge support={support} /> : null}
      </header>
      {reason && support && support !== "SUPPORTED" ? (
        <p className="border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground">
          {reason}
        </p>
      ) : null}
      <div className="px-3 py-2">{children}</div>
    </section>
  );
}

function UnsupportedRow({
  label,
  bucket,
}: {
  label: string;
  bucket: Gstr3bBucket;
}) {
  const text =
    bucket.support === "NOT_IMPLEMENTED_IN_V1"
      ? NOT_V1
      : bucket.support === "NOT_AVAILABLE"
        ? NOT_YET
        : supportLabel(bucket.support) ?? NOT_YET;
  return (
    <tr className="border-t border-border/60">
      <td className="px-2 py-1.5 text-[11px] text-foreground">{label}</td>
      <td
        colSpan={6}
        className="px-2 py-1.5 text-[11px] text-muted-foreground"
        title={bucket.reason ?? undefined}
      >
        {text}
        {bucket.reason ? (
          <span className="ml-1 text-[10px] opacity-80">
            — {bucket.reason}
          </span>
        ) : null}
      </td>
    </tr>
  );
}

function ItcBreakupBlock({
  title,
  breakup,
  unavailable,
  unavailableReason,
}: {
  title: string;
  breakup: Gstr3bItcBreakup | null;
  unavailable?: boolean;
  unavailableReason?: string | null;
}) {
  if (unavailable || !breakup) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-2">
        <p className="text-[11px] font-medium text-foreground">{title}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {NA}
          {unavailableReason ? ` — ${unavailableReason}` : ""}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-muted/5 px-3 py-2 space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold text-foreground">{title}</p>
        <p className={cn("text-xs font-semibold tabular-nums", MONEY_AMOUNT_CLASS)}>
          Total {formatMoneyString(breakup.total)}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-[11px]">
        <span>
          IGST{" "}
          <span className={cn("tabular-nums", MONEY_AMOUNT_CLASS)}>
            {formatMoneyString(breakup.igst)}
          </span>
        </span>
        <span>
          CGST{" "}
          <span className={cn("tabular-nums", MONEY_AMOUNT_CLASS)}>
            {formatMoneyString(breakup.cgst)}
          </span>
        </span>
        <span>
          SGST{" "}
          <span className={cn("tabular-nums", MONEY_AMOUNT_CLASS)}>
            {formatMoneyString(breakup.sgst)}
          </span>
        </span>
        <span>
          Cess{" "}
          <span className={cn("tabular-nums", MONEY_AMOUNT_CLASS)}>
            {formatMoneyString(breakup.cess)}
          </span>
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Rows: {breakup.row_count}
        {breakup.amount_basis ? ` · Basis: ${breakup.amount_basis}` : ""}
      </p>
      {breakup.notes ? (
        <p className="text-[10px] text-muted-foreground leading-snug">
          {breakup.notes}
        </p>
      ) : null}
    </div>
  );
}

function MiniTable({
  children,
  headers,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {headers.map((h) => (
              <th
                key={h}
                className={cn(
                  "px-2 py-1 font-medium text-left",
                  h !== "Particulars" && h !== "Status" && "text-right",
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Gstr3bWorkingReport({ report }: { report: Gstr3bWorkingResult }) {
  const s31 = report.section_3_1;
  const a = s31.a;
  const aValues = a.values;
  const allOther = report.section_4.available.all_other_itc;
  const allOtherUnavailable = allOther.support === "NOT_AVAILABLE";
  const net = report.section_4.net_working;
  const books = report.books_control;
  const g2b = report.gstr2b_control;
  const pay = report.tax_payment_utilization;

  const moneyHeaders = [
    "Particulars",
    "Taxable",
    "IGST",
    "CGST",
    "SGST",
    "Cess",
    "GST Total",
  ];

  return (
    <div className="space-y-3">
      {(report.health.warnings.length > 0 ||
        Object.keys(report.notes).length > 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 space-y-1">
          {report.health.warnings.map((w) => (
            <p key={w} className="text-[11px] text-amber-800">
              {w}
            </p>
          ))}
        </div>
      )}

      <SectionCard
        title="3.1 Details of Outward Supplies"
        support={a.support}
        reason={a.reason}
      >
        <MiniTable headers={moneyHeaders}>
          <tr className="border-t border-border/60">
            <td className="px-2 py-1.5 text-[11px]">
              <span className="font-medium">(a) Outward taxable supplies</span>
              {aValues ? (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({aValues.document_count} docs
                  {aValues.credit_note_count
                    ? `, ${aValues.credit_note_count} CN`
                    : ""}
                  )
                </span>
              ) : null}
            </td>
            <MoneyCell value={aValues?.taxable_value} support={a.support} />
            <MoneyCell value={aValues?.igst} support={a.support} />
            <MoneyCell value={aValues?.cgst} support={a.support} />
            <MoneyCell value={aValues?.sgst} support={a.support} />
            <MoneyCell value={aValues?.cess} support="NOT_AVAILABLE" />
            <MoneyCell value={aValues?.gst_total} support={a.support} />
          </tr>
          <UnsupportedRow label="(b) Zero rated / Export / SEZ" bucket={s31.b} />
          <UnsupportedRow label="(c) Nil rated / Exempt" bucket={s31.c} />
          <UnsupportedRow label="(d) Reverse charge (RCM)" bucket={s31.d} />
          <UnsupportedRow label="(e) Non-GST outward" bucket={s31.e} />
          <UnsupportedRow
            label="3.1.1 Supplies notified u/s 9(5)"
            bucket={report.section_3_1_1}
          />
        </MiniTable>
        {aValues && aValues.ambiguous_zero_tax_excluded_count > 0 ? (
          <p className="mt-2 text-[10px] text-amber-800">
            {aValues.ambiguous_zero_tax_excluded_count} ambiguous 0%-tax
            document(s) excluded from 3.1(a) — not classified as nil / exempt /
            zero-rated / non-GST.
          </p>
        ) : null}
      </SectionCard>

      <SectionCard
        title="3.2 Supplies to Unregistered / Composition / UIN"
        support="NOT_AVAILABLE"
        reason="Statutory recipient classification for 3.2 is not complete in V1."
      >
        <MiniTable headers={["Particulars", "Status"]}>
          <UnsupportedRow
            label="Supplies to unregistered persons"
            bucket={report.section_3_2.unregistered}
          />
          <UnsupportedRow
            label="Supplies to composition taxable persons"
            bucket={report.section_3_2.composition}
          />
          <UnsupportedRow
            label="Supplies to UIN holders"
            bucket={report.section_3_2.uin}
          />
        </MiniTable>
      </SectionCard>

      <SectionCard
        title="4. Eligible ITC — All Other ITC (working)"
        support={allOther.support}
        reason={allOther.reason}
      >
        <div className="space-y-2">
          <MiniTable headers={["Particulars", "Status"]}>
            <UnsupportedRow
              label="(A) Import of goods"
              bucket={report.section_4.available.import_goods}
            />
            <UnsupportedRow
              label="(A) Import of services"
              bucket={report.section_4.available.import_services}
            />
            <UnsupportedRow
              label="(A) Inward supplies liable to reverse charge"
              bucket={report.section_4.available.rcm}
            />
            <UnsupportedRow
              label="(A) Inward supplies from ISD"
              bucket={report.section_4.available.isd}
            />
          </MiniTable>

          <div className="grid gap-2 sm:grid-cols-2 pt-1">
            <ItcBreakupBlock
              title="Suggested Eligible ITC"
              breakup={allOther.values?.suggested_eligible_itc ?? null}
              unavailable={allOtherUnavailable}
              unavailableReason={allOther.reason}
            />
            <ItcBreakupBlock
              title="Final Claimed ITC"
              breakup={allOther.values?.final_claimed_itc ?? null}
              unavailable={allOtherUnavailable}
              unavailableReason={allOther.reason}
            />
          </div>

          <p
            className="text-[11px] text-muted-foreground"
            title={report.section_4.reversal.reason ?? undefined}
          >
            <span className="font-medium text-foreground">(B) ITC Reversed:</span>{" "}
            {NOT_YET}
            {report.section_4.reversal.reason
              ? ` — ${report.section_4.reversal.reason}`
              : ""}
          </p>

          <SectionCard
            title="(C) Net ITC Working (partial)"
            support={net.support}
            reason={net.reason}
            accent
          >
            {net.support === "NOT_AVAILABLE" || !net.values ? (
              <p className="text-[11px] text-muted-foreground">
                {NA}
                {net.reason ? ` — ${net.reason}` : ""}
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-amber-800">{net.values.note}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <ItcBreakupBlock
                    title="Suggested Net ITC Working"
                    breakup={net.values.suggested_net_itc_working}
                  />
                  <ItcBreakupBlock
                    title="Final Claimed ITC Working"
                    breakup={net.values.final_claimed_itc_working}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Not filing-ready Net ITC. Statutory reversal deductions are not
                  included because Section 4(B) is not currently supported.
                </p>
              </div>
            )}
          </SectionCard>

          <p
            className="text-[11px] text-muted-foreground"
            title={report.section_4.other_details.reason ?? undefined}
          >
            <span className="font-medium text-foreground">
              (D) Other details:
            </span>{" "}
            {NOT_YET}
            {report.section_4.other_details.reason
              ? ` — ${report.section_4.other_details.reason}`
              : ""}
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="5. Exempt / Nil / Non-GST inward supplies"
        support="NOT_AVAILABLE"
        reason="Do not infer from GST = 0."
      >
        <MiniTable headers={["Particulars", "Status"]}>
          {(
            [
              ["Interstate — Exempt", report.section_5.interstate_exempt],
              ["Interstate — Nil", report.section_5.interstate_nil],
              ["Interstate — Non-GST", report.section_5.interstate_non_gst],
              ["Intrastate — Exempt", report.section_5.intrastate_exempt],
              ["Intrastate — Nil", report.section_5.intrastate_nil],
              ["Intrastate — Non-GST", report.section_5.intrastate_non_gst],
            ] as const
          ).map(([label, bucket]) => (
            <UnsupportedRow key={label} label={label} bucket={bucket} />
          ))}
        </MiniTable>
      </SectionCard>

      <SectionCard
        title="Books GST Control"
        support={books.support}
        reason={books.reason}
        accent
      >
        {books.values ? (
          <div className="space-y-2">
            <p className="inline-flex rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
              NON-STATUTORY CONTROL
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              {(
                [
                  ["Output CGST", books.values.output_cgst],
                  ["Output SGST", books.values.output_sgst],
                  ["Output IGST", books.values.output_igst],
                  ["Output GST", books.values.output_gst],
                  ["Input CGST", books.values.input_cgst],
                  ["Input SGST", books.values.input_sgst],
                  ["Input IGST", books.values.input_igst],
                  ["Input GST", books.values.input_gst],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded border border-border px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className={cn("tabular-nums font-medium", MONEY_AMOUNT_CLASS)}>
                    {formatMoneyString(value)}
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded border border-border bg-muted/10 px-2 py-1.5">
              <p className="text-[10px] text-muted-foreground">
                Books GST Working Difference
              </p>
              <p className={cn("text-sm font-semibold tabular-nums", MONEY_AMOUNT_CLASS)}>
                {formatMoneyString(books.values.books_gst_working_difference)}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground">{books.values.note}</p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">{NA}</p>
        )}
      </SectionCard>

      <SectionCard
        title="GSTR-2B ITC Control / Workflow"
        support={g2b.support}
        reason={g2b.reason}
      >
        {g2b.values ? (
          <div className="space-y-2">
            <p className="inline-flex rounded border border-border bg-muted/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              WORKFLOW CONTROL
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              {(
                [
                  ["Portal ITC available", g2b.values.portal_itc_available_count],
                  [
                    "Portal ITC not available",
                    g2b.values.portal_itc_not_available_count,
                  ],
                  ["To review", g2b.values.to_review_count],
                  ["Hold", g2b.values.hold_count],
                  ["Ineligible", g2b.values.ineligible_count],
                  ["Eligible to claim", g2b.values.eligible_to_claim_count],
                  ["Claimed", g2b.values.claimed_count],
                ] as const
              ).map(([label, count]) => (
                <div key={label} className="rounded border border-border px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="font-medium tabular-nums">{count}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-2">
              <p className="text-[11px] font-medium text-foreground">
                Items marked Reversal Required:{" "}
                {g2b.values.reversal_required_count}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Compliance workflow only — not a statutory Section 4(B) amount.
              </p>
            </div>
            {g2b.values.note ? (
              <p className="text-[10px] text-muted-foreground">{g2b.values.note}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {NA}
            {g2b.reason ? ` — ${g2b.reason}` : ""}
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="Tax Payment / Utilization"
        support={pay.support}
        reason={pay.reason}
      >
        <p className="text-[11px] text-muted-foreground">
          {NOT_V1}
          {pay.reason ? ` — ${pay.reason}` : ""}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Electronic cash/credit ledger, challan, interest, late fee, and filing
          are outside GSTR-3B V1. This screen is report/compliance working only.
        </p>
      </SectionCard>
    </div>
  );
}
