"use client";

/**
 * Transport details for Dispatch create/edit.
 * Used for stock_transfer (same-GSTIN EWB path) — mirrors invoice goods transport fields.
 */

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TRANSPORT_MODES = ["Road", "Rail", "Air", "Ship", "Other"] as const;

export type DispatchTransportState = {
  transportMode: string;
  transporterName: string;
  transporterId: string;
  vehicleNo: string;
  lrNo: string;
  lrDate: string;
  transportDocNo: string;
  transportDocDate: string;
  distanceKm: string;
};

export const EMPTY_DISPATCH_TRANSPORT: DispatchTransportState = {
  transportMode: "",
  transporterName: "",
  transporterId: "",
  vehicleNo: "",
  lrNo: "",
  lrDate: "",
  transportDocNo: "",
  transportDocDate: "",
  distanceKm: "",
};

export function toDateInputValue(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

/** Map form state → Dispatch API create/update payload fields. */
export function buildDispatchTransportPayload(
  transport: DispatchTransportState,
): Record<string, string | number | null> {
  const distanceRaw = transport.distanceKm.trim();
  const distanceNum =
    distanceRaw === "" ? null : Number(distanceRaw);

  return {
    transporter: transport.transporterName.trim() || null,
    transporter_id: transport.transporterId.trim() || null,
    transport_mode: transport.transportMode.trim() || null,
    vehicle_number: transport.vehicleNo.trim() || null,
    lr_number: transport.lrNo.trim() || null,
    lr_date: transport.lrDate
      ? new Date(transport.lrDate).toISOString()
      : null,
    transport_doc_number: transport.transportDocNo.trim() || null,
    transport_doc_date: transport.transportDocDate
      ? new Date(transport.transportDocDate).toISOString()
      : null,
    approx_distance:
      distanceNum != null && Number.isFinite(distanceNum) ? distanceNum : null,
  };
}

export function transportFromDispatchRecord(
  data: Record<string, unknown>,
): DispatchTransportState {
  return {
    transportMode: String(data.transport_mode ?? "").trim(),
    transporterName: String(data.transporter ?? "").trim(),
    transporterId: String(data.transporter_id ?? "").trim(),
    vehicleNo: String(data.vehicle_number ?? "").trim(),
    lrNo: String(data.lr_number ?? "").trim(),
    lrDate: toDateInputValue(data.lr_date),
    transportDocNo: String(data.transport_doc_number ?? "").trim(),
    transportDocDate: toDateInputValue(data.transport_doc_date),
    distanceKm:
      data.approx_distance != null && data.approx_distance !== ""
        ? String(data.approx_distance)
        : "",
  };
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
        {label}
        {required ? <span className="text-red-500 ml-0.5">*</span> : null}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function DispatchTransportDetailsSection({
  value,
  onChange,
  hint,
}: {
  value: DispatchTransportState;
  onChange: (patch: Partial<DispatchTransportState>) => void;
  hint?: string;
}) {
  const set = (patch: Partial<DispatchTransportState>) => onChange(patch);

  return (
    <div className="space-y-4">
      {hint ? (
        <p className="text-[11px] text-muted-foreground leading-relaxed">{hint}</p>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Field label="Transport Mode" required>
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
          <Input
            value={value.transporterName}
            onChange={(e) => set({ transporterName: e.target.value })}
            placeholder="Transporter name"
            className="h-8 text-xs"
          />
        </Field>
        <Field label="Transporter ID">
          <Input
            value={value.transporterId}
            onChange={(e) => set({ transporterId: e.target.value })}
            placeholder="GSTIN / ID"
            className="h-8 text-xs"
          />
        </Field>
        <Field label="Vehicle No.">
          <Input
            value={value.vehicleNo}
            onChange={(e) => set({ vehicleNo: e.target.value.toUpperCase() })}
            placeholder="MH-12-AB-1234"
            className="h-8 text-xs font-mono uppercase"
          />
        </Field>
        <Field label="Distance (KM)" required>
          <Input
            type="number"
            min={0}
            value={value.distanceKm}
            onChange={(e) => set({ distanceKm: e.target.value })}
            placeholder="0"
            className="h-8 text-xs tabular-nums text-right"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Field label="LR / Lorry Receipt No.">
          <Input
            value={value.lrNo}
            onChange={(e) => set({ lrNo: e.target.value })}
            placeholder="LR number"
            className="h-8 text-xs"
          />
        </Field>
        <Field label="LR Date">
          <Input
            type="date"
            value={value.lrDate}
            onChange={(e) => set({ lrDate: e.target.value })}
            className="h-8 text-xs"
          />
        </Field>
        <Field label="Transport Doc No.">
          <Input
            value={value.transportDocNo}
            onChange={(e) => set({ transportDocNo: e.target.value })}
            placeholder="Transport document no."
            className="h-8 text-xs"
          />
        </Field>
        <Field label="Transport Doc Date">
          <Input
            type="date"
            value={value.transportDocDate}
            onChange={(e) => set({ transportDocDate: e.target.value })}
            className="h-8 text-xs"
          />
        </Field>
      </div>
    </div>
  );
}

/** Soft check before create/update — EWB generate still validates hard. */
export function validateDispatchTransportSoft(
  transport: DispatchTransportState,
): string | null {
  if (!transport.transportMode.trim()) {
    return "Transport mode is required for stock transfer dispatch.";
  }
  if (!transport.distanceKm.trim() || Number(transport.distanceKm) < 0) {
    return "Approx. distance (km) is required for stock transfer dispatch.";
  }
  if (
    !transport.transporterName.trim() &&
    !transport.transporterId.trim()
  ) {
    return "Enter transporter name or transporter ID.";
  }
  const mode = transport.transportMode.trim().toLowerCase();
  if (mode === "road" || mode === "1") {
    if (!transport.vehicleNo.trim()) {
      return "Vehicle number is required for Road transport.";
    }
  } else {
    const docNo =
      transport.transportDocNo.trim() || transport.lrNo.trim();
    const docDate =
      transport.transportDocDate.trim() || transport.lrDate.trim();
    if (!docNo) {
      return "Transport document number (or LR number) is required for this transport mode.";
    }
    if (!docDate) {
      return "Transport document date (or LR date) is required for this transport mode.";
    }
  }
  return null;
}
