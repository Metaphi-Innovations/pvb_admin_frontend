"use client";

import React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  GstAutoFillPayload,
  GstPrincipalAddress,
  GstVerificationDetails,
} from "./gst.types";
import { toGstAutoFillPayload } from "./gst.types";
import { cn } from "@/lib/utils";

function FieldRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  const display = value?.trim() ? value : "—";
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-1 text-xs border-b border-border/40 last:border-0">
      <dt className="text-muted-foreground font-medium">{label}</dt>
      <dd className={cn("text-foreground break-words", mono && "font-mono")}>
        {display}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <dl className="rounded-lg border border-border/60 bg-muted/20 px-3 py-1">
        {children}
      </dl>
    </section>
  );
}

function AddressBlock({
  title,
  address,
}: {
  title: string;
  address: GstPrincipalAddress;
}) {
  return (
    <Section title={title}>
      <FieldRow label="Building Name" value={address.buildingName} />
      <FieldRow label="Building / Door No." value={address.buildingNumber} />
      <FieldRow label="Floor" value={address.floorNumber} />
      <FieldRow label="Street" value={address.street} />
      <FieldRow label="Locality" value={address.locality} />
      <FieldRow label="Location / City" value={address.location} />
      <FieldRow label="District" value={address.district} />
      <FieldRow label="State" value={address.state} />
      <FieldRow label="Pincode" value={address.pincode} mono />
      <FieldRow label="Landmark" value={address.landmark} />
    </Section>
  );
}

export function GstVerificationDialog({
  open,
  details,
  onOpenChange,
  onAutoFill,
  onCancel,
}: {
  open: boolean;
  details: GstVerificationDetails | null;
  onOpenChange: (open: boolean) => void;
  onAutoFill: (payload: GstAutoFillPayload) => void;
  onCancel?: () => void;
}) {
  if (!details) return null;

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleAutoFill = () => {
    onAutoFill(toGstAutoFillPayload(details));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-base">GSTIN Verification</DialogTitle>
          <DialogDescription className="text-xs">
            Review GST registration details from the GST portal. Auto-fill only
            updates legal name and legal address when you confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <Section title="GST Registration">
            <FieldRow label="GSTIN" value={details.gstin} mono />
            <FieldRow label="Legal Name" value={details.legalName} />
            <FieldRow label="Trade Name" value={details.tradeName} />
            <FieldRow label="Registration Type" value={details.registrationType} />
            <FieldRow label="GST Status" value={details.status} />
            <FieldRow label="Registration Date" value={details.registrationDate} />
            <FieldRow label="Business Type" value={details.businessType} />
            <FieldRow label="e-Invoice Status" value={details.einvoiceStatus} />
          </Section>

          <Section title="Business Information">
            <FieldRow
              label="Nature of Business"
              value={
                details.natureOfBusiness?.length
                  ? details.natureOfBusiness.join(", ")
                  : ""
              }
            />
          </Section>

          <AddressBlock
            title="Principal Address"
            address={details.principalAddress}
          />

          <Section title="Additional Places of Business">
            {details.additionalAddresses?.length ? (
              details.additionalAddresses.map((addr, idx) => (
                <div key={idx} className="py-2 border-b border-border/40 last:border-0">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1">
                    Place {idx + 1}
                  </p>
                  <FieldRow label="Building Name" value={addr.buildingName} />
                  <FieldRow label="Street" value={addr.street} />
                  <FieldRow label="Locality" value={addr.locality} />
                  <FieldRow label="Location / City" value={addr.location} />
                  <FieldRow label="District" value={addr.district} />
                  <FieldRow label="State" value={addr.state} />
                  <FieldRow label="Pincode" value={addr.pincode} mono />
                </div>
              ))
            ) : (
              <p className="py-2 text-xs text-muted-foreground">
                No additional places of business
              </p>
            )}
          </Section>

          <Section title="Jurisdiction (reference)">
            <FieldRow
              label="State Jurisdiction"
              value={[
                details.jurisdiction?.stateJurisdictionCode,
                details.jurisdiction?.stateJurisdiction,
              ]
                .filter(Boolean)
                .join(" — ")}
            />
            <FieldRow
              label="Central Jurisdiction"
              value={[
                details.jurisdiction?.centralJurisdictionCode,
                details.jurisdiction?.centralJurisdiction,
              ]
                .filter(Boolean)
                .join(" — ")}
            />
            <FieldRow
              label="Latitude"
              value={details.principalAddress?.latitude}
              mono
            />
            <FieldRow
              label="Longitude"
              value={details.principalAddress?.longitude}
              mono
            />
          </Section>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 mb-1.5">
              Fields that can be auto-filled
            </p>
            <ul className="space-y-1">
              <li className="flex items-center gap-1.5 text-xs text-emerald-900">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Legal Name
              </li>
              <li className="flex items-center gap-1.5 text-xs text-emerald-900">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Legal Address
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border bg-muted/30 sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleAutoFill}
          >
            Auto Fill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
