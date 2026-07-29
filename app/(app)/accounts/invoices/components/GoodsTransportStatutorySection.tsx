"use client";

/**
 * Goods Sales Invoice — Transport & Statutory Details (editable by Accounts).
 * Module-scoped to soGen / sourceType=sales_order. Not used by Service Invoice.
 * Statutory Generate actions live in GoodsStatutoryGenerationSection (bottom).
 */

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TRANSPORT_MODES = ["Road", "Rail", "Air", "Ship", "Other"] as const;

export type GoodsEwayStatus = "not_generated" | "generated" | "manual" | "stale";
export type GoodsEInvoiceStatus =
  | "not_applicable"
  | "not_generated"
  | "generated"
  | "stale";

export interface GoodsTransportStatutoryState {
  transportMode: string;
  transporterName: string;
  transporterId: string;
  vehicleNo: string;
  lrNo: string;
  lrDate: string;
  transportDocNo: string;
  transportDocDate: string;
  distanceKm: string;
  ewayBillNo: string;
  ewayBillExpiryDate: string;
  ewayBillStatus: GoodsEwayStatus;
  eInvoiceNo: string;
  acknowledgementNo: string;
  acknowledgementDate: string;
  irn: string;
  eInvoiceStatus: GoodsEInvoiceStatus;
  qrCodeAvailable: boolean;
}

export const EMPTY_TRANSPORT_STATUTORY: GoodsTransportStatutoryState = {
  transportMode: "",
  transporterName: "",
  transporterId: "",
  vehicleNo: "",
  lrNo: "",
  lrDate: "",
  transportDocNo: "",
  transportDocDate: "",
  distanceKm: "",
  ewayBillNo: "",
  ewayBillExpiryDate: "",
  ewayBillStatus: "not_generated",
  eInvoiceNo: "",
  acknowledgementNo: "",
  acknowledgementDate: "",
  irn: "",
  eInvoiceStatus: "not_generated",
  qrCodeAvailable: false,
};

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("so-goods-field so-transport-cell", className)}>
      <p className="so-goods-field__label">{label}</p>
      <div className="so-goods-field__control">{children}</div>
      <p className="so-goods-field__helper">&nbsp;</p>
    </div>
  );
}

function CtrlInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <Input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn("h-8 text-xs w-full", className)}
    />
  );
}

export function GoodsTransportStatutorySection({
  value,
  onChange,
  hideDistance = false,
}: {
  value: GoodsTransportStatutoryState;
  onChange: (patch: Partial<GoodsTransportStatutoryState>) => void;
  /** Stock Transfer: Distance field hidden from UI. */
  hideDistance?: boolean;
}) {
  const set = (patch: Partial<GoodsTransportStatutoryState>) => onChange(patch);

  return (
    <div className="so-transport-layout space-y-2">
      <div
        className={cn(
          "so-transport-grid",
          hideDistance ? "so-transport-grid--docs" : "so-transport-grid--5",
        )}
      >
        <Field label="Transport Mode">
          <Select
            value={value.transportMode || undefined}
            onValueChange={(v) => set({ transportMode: v })}
          >
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue placeholder="Select mode…" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              {TRANSPORT_MODES.map((m) => (
                <SelectItem key={m} value={m} className="text-xs font-normal">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Transporter Name">
          <CtrlInput
            value={value.transporterName}
            onChange={(v) => set({ transporterName: v })}
            placeholder="Transporter name"
          />
        </Field>
        <Field label="Transporter ID">
          <CtrlInput
            value={value.transporterId}
            onChange={(v) => set({ transporterId: v })}
            placeholder="GSTIN / ID"
          />
        </Field>
        <Field label="Vehicle No.">
          <CtrlInput
            value={value.vehicleNo}
            onChange={(v) => set({ vehicleNo: v })}
            placeholder="MH-12-AB-1234"
            className="font-mono uppercase"
          />
        </Field>
        {!hideDistance ? (
          <Field label="Distance (KM)">
            <CtrlInput
              type="number"
              value={value.distanceKm}
              onChange={(v) => set({ distanceKm: v })}
              placeholder="0"
              className="tabular-nums text-right"
            />
          </Field>
        ) : null}
      </div>

      <div className="so-transport-grid so-transport-grid--docs">
        <Field label="LR / Lorry Receipt No." className="so-span-1">
          <CtrlInput value={value.lrNo} onChange={(v) => set({ lrNo: v })} placeholder="LR number" />
        </Field>
        <Field label="LR Date" className="so-span-1">
          <CtrlInput type="date" value={value.lrDate} onChange={(v) => set({ lrDate: v })} />
        </Field>
        <Field label="Transport Doc No." className="so-span-1">
          <CtrlInput
            value={value.transportDocNo}
            onChange={(v) => set({ transportDocNo: v })}
            placeholder="Transport document no."
          />
        </Field>
        <Field label="Transport Doc Date" className="so-span-1">
          <CtrlInput
            type="date"
            value={value.transportDocDate}
            onChange={(v) => set({ transportDocDate: v })}
          />
        </Field>
      </div>
    </div>
  );
}
