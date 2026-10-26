"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  type Customer,
  type CustomerStatus,
  CUSTOMER_TYPE_LABELS,
  formatMobile,
  formatCreditLimit,
  getActiveGSTMasters,
  getActiveTDSMasters,
} from "@/app/(app)/masters/customers/customer-data";
import { formatTdsSummary } from "@/app/(app)/masters/tds/tds-data";
import { formatPartyPaymentTerms } from "@/lib/masters/payment-terms";
import {
  ComplianceCertificationsGrid,
  type ComplianceGridValues,
} from "@/components/masters/erp/ComplianceCertificationsGrid";

const STATUS_CFG: Record<CustomerStatus, { bg: string; text: string; dot: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  inactive: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "Inactive" },
  draft: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Draft" },
  blocked: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400", label: "Blocked" },
};

function InfoRow({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  const display =
    value !== undefined && value !== null && String(value).trim() !== ""
      ? String(value)
      : "—";
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-muted-foreground flex-shrink-0 w-28">{label}</span>
      <span className={cn("text-xs font-medium text-foreground text-right flex-1 min-w-0 break-words", mono && "font-mono")}>
        {display}
      </span>
    </div>
  );
}

function Block({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{title}</p>
      <div className="rounded-lg border border-border bg-muted/10 px-3 py-0.5">{children}</div>
    </div>
  );
}

type CustomerInfoModel = Customer & { tdsSectionLabel?: string };

interface CustomerInfoDialogProps {
  customer: CustomerInfoModel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CustomerInfoDialog({ customer, open, onOpenChange }: CustomerInfoDialogProps) {
  const complianceValues = useMemo<ComplianceGridValues | null>(() => {
    if (!customer) return null;
    return {
      msmeRegistered: !!customer.msmeRegistered,
      msmeNumber: customer.msmeNumber || "",
      msmeValidityDate: customer.msmeValidityDate || "",
      fssaiRegistered: !!customer.fssaiRegistered,
      fssai: customer.fssai || "",
      fssaiValidityDate: customer.fssaiValidityDate || "",
      cibRegistered: !!customer.cibRegistered,
      cibRegn: customer.cibRegn || "",
      cibValidityDate: customer.cibValidityDate || "",
      fcoRegistered: !!customer.fcoRegistered,
      fcoRegn: customer.fcoRegn || "",
      fcoValidityDate: customer.fcoValidityDate || "",
    };
  }, [customer]);

  if (!customer) return null;

  const gst = getActiveGSTMasters().find(g => g.id === customer.gstMasterId);
  const tds = getActiveTDSMasters().find(t => t.id === customer.tdsMasterId);
  const typeLabel =
    CUSTOMER_TYPE_LABELS[customer.customerType] ||
    customer.customerType ||
    undefined;
  const payLabel = formatPartyPaymentTerms(customer);
  const gstCodeLabel = customer.gstCategory
    ? customer.gstCategory
    : gst
      ? `${gst.gstId} (${gst.gstPercentage}%)`
      : undefined;
  const tdsLabel = tds
    ? `${formatTdsSummary(tds)} — ${tds.sectionName}`
    : customer.tdsSectionLabel || undefined;
  const st = STATUS_CFG[customer.status] ?? STATUS_CFG.active;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-start gap-2 pr-6">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-sm font-semibold leading-tight truncate">
                {customer.customerName}
              </DialogTitle>
              <DialogDescription className="font-mono text-xs text-brand-700 mt-0.5">
                {customer.customerCode}
              </DialogDescription>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0",
                st.bg,
                st.text,
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
              {st.label}
            </span>
          </div>
        </DialogHeader>

        <div className="px-5 py-4 grid grid-cols-2 gap-4 overflow-y-auto min-h-0">
          <Block title="Contact">
            <InfoRow label="Type" value={typeLabel} />
            <InfoRow label="Mobile" value={formatMobile(customer.countryCode, customer.mobile)} mono />
            <InfoRow label="Email" value={customer.email} />
          </Block>

          <Block title="Sales & Credit">
            <InfoRow label="Salesman" value={customer.salesManName} />
            <InfoRow label="Credit Limit" value={formatCreditLimit(customer.creditLimit ?? 0)} />
            <InfoRow label="Payment Terms" value={payLabel === "—" ? undefined : payLabel} />
          </Block>

          <Block title="Address">
            <InfoRow label="Address" value={customer.address} />
            <InfoRow label="State" value={customer.stateName} />
            <InfoRow label="District" value={customer.districtName} />
            <InfoRow label="Pin Code" value={customer.pincode} mono />
          </Block>

          <Block title="Tax">
            <InfoRow label="GST Applicable" value={customer.gstApplicable ? "Yes" : "No"} />
            {customer.gstApplicable && (
              <>
                <InfoRow label="GSTIN" value={customer.gstin} mono />
                <InfoRow label="GST Code" value={gstCodeLabel} mono />
              </>
            )}
            <InfoRow label="TDS Applicable" value={customer.tdsApplicable ? "Yes" : "No"} />
            {customer.tdsApplicable && (
              <InfoRow label="TDS Section" value={tdsLabel} mono />
            )}
          </Block>

          {complianceValues && (
            <Block title="Compliance & Certifications" className="col-span-2">
              <div className="py-2">
                <ComplianceCertificationsGrid
                  values={complianceValues}
                  onChange={() => {}}
                  readOnly
                  showValidityDates
                />
              </div>
            </Block>
          )}

          {customer.status === "blocked" && customer.blockReason && (
            <p className="col-span-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              Blocked: {customer.blockReason}
            </p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border bg-muted/20 flex justify-end gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" asChild>
            <Link href={`/masters/customers/${customer.id}`} onClick={() => onOpenChange(false)}>
              View full profile
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
