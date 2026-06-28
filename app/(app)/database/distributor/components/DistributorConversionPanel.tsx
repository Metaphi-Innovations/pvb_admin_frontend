"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ExternalLink, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Distributor } from "../distributor-data";
import { CONVERT_DISTRIBUTOR_STORAGE_KEY } from "@/lib/distributor/distributor-conversion";

const AUTO_MAPPED_FIELDS = [
  "Customer Name / Firm Name",
  "Contact Person",
  "Mobile Number",
  "Address, District, State, Pincode",
  "Recommended Category (from Score & Credit)",
  "Recommended Credit Limit (editable)",
  "Recommended Credit Days (editable)",
];

const MANUAL_FIELDS = [
  "GST Details / GSTIN",
  "PAN",
  "Payment Terms",
  "Billing Details (if missing)",
  "Shipping Details (if missing)",
  "Credit Limit (editable override)",
  "Credit Days (editable override)",
];

export function DistributorConversionPanel({ distributor }: { distributor: Distributor }) {
  const router = useRouter();
  const isConverted = distributor.conversionStatus === "customer_completed";

  const handleConvert = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(CONVERT_DISTRIBUTOR_STORAGE_KEY, String(distributor.id));
    }
    router.push(`/masters/customers/new?fromDistributor=${distributor.id}`);
  };

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-foreground">Distributor Status</p>
            <p className="mt-1 text-sm font-bold text-foreground">
              {isConverted ? "Converted" : "Not Converted"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {isConverted
                ? "Customer record exists. Sales orders allowed when customer is active."
                : "Not available in Customer Master. Sales orders cannot be created until conversion."}
            </p>
          </div>
          {!isConverted && (
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-brand-600 text-xs hover:bg-brand-700"
              onClick={handleConvert}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Convert to Customer
            </Button>
          )}
        </div>
      </div>

      {isConverted && distributor.convertedCustomerId && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
          <div>
            <p className="text-xs font-semibold text-emerald-800">Converted to Customer</p>
            <p className="mt-0.5 text-[11px] text-emerald-700">
              Customer inherits calculated category and recommended credit from Score &amp; Credit.
              Credit limit and days remain editable in Customer Master.
            </p>
            <Link
              href={`/masters/customers/${distributor.convertedCustomerId}`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
            >
              Open Customer Profile
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {!isConverted && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-white shadow-sm">
            <div className="border-b border-border/60 bg-muted/20 px-3 py-2">
              <p className="text-xs font-semibold text-foreground">Auto-mapped to Customer Master</p>
            </div>
            <ul className="space-y-1.5 px-3 py-2.5">
              {AUTO_MAPPED_FIELDS.map((field) => (
                <li key={field} className="flex items-start gap-2 text-xs text-foreground">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                  {field}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-white shadow-sm">
            <div className="border-b border-border/60 bg-muted/20 px-3 py-2">
              <p className="text-xs font-semibold text-foreground">Complete manually in Customer Master</p>
            </div>
            <ul className="space-y-1.5 px-3 py-2.5">
              {MANUAL_FIELDS.map((field) => (
                <li key={field} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                  {field}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
