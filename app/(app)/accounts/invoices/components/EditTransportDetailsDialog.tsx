"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { InvoiceRecord } from "../invoices-data";
import {
  EMPTY_TRANSPORT_STATUTORY,
  GoodsTransportStatutorySection,
  type GoodsTransportStatutoryState,
} from "./GoodsTransportStatutorySection";
import type { UpdateTransportDetailsPayload } from "@/services/sales-invoice.service";
import "./../sales-order-invoice-form-compact.css";

function recordToTransportState(
  record: InvoiceRecord,
): GoodsTransportStatutoryState {
  return {
    ...EMPTY_TRANSPORT_STATUTORY,
    transportMode: record.transportMode || "",
    transporterName: record.transporterName || "",
    transporterId: record.transporterId || "",
    vehicleNo: record.vehicleNo || "",
    lrNo: record.lrNo || "",
    lrDate: record.lrDate || "",
    transportDocNo: record.transportDocNo || "",
    transportDocDate: record.transportDocDate || "",
    distanceKm:
      record.distanceKm != null && record.distanceKm > 0
        ? String(record.distanceKm)
        : "",
  };
}

export function transportStateToPayload(
  state: GoodsTransportStatutoryState,
): UpdateTransportDetailsPayload {
  const distanceRaw = state.distanceKm.trim();
  const distanceKm =
    distanceRaw === "" ? null : Number(distanceRaw);
  return {
    transporter: state.transporterName.trim() || null,
    transporter_id: state.transporterId.trim() || null,
    transport_mode: state.transportMode.trim() || null,
    vehicle_number: state.vehicleNo.trim() || null,
    lr_number: state.lrNo.trim() || null,
    lr_date: state.lrDate.trim() || null,
    transport_doc_number: state.transportDocNo.trim() || null,
    transport_doc_date: state.transportDocDate.trim() || null,
    approx_distance:
      distanceKm != null && Number.isFinite(distanceKm) ? distanceKm : null,
  };
}

export function EditTransportDetailsDialog({
  open,
  onClose,
  record,
  saving,
  hideDistance = false,
  ewayGenerated = false,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  record: InvoiceRecord;
  saving?: boolean;
  hideDistance?: boolean;
  ewayGenerated?: boolean;
  onSave: (payload: UpdateTransportDetailsPayload) => void;
}) {
  const [transport, setTransport] = useState<GoodsTransportStatutoryState>(
    () => recordToTransportState(record),
  );

  useEffect(() => {
    if (!open) return;
    setTransport(recordToTransportState(record));
  }, [open, record]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) onClose();
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transporter Details</DialogTitle>
          <DialogDescription>
            Update transporter, vehicle, and LR details only. Invoice amounts
            and posting are not changed.
          </DialogDescription>
        </DialogHeader>

        {ewayGenerated ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            An E-Way Bill is already generated for this invoice. After saving,
            cancel and regenerate the E-Way Bill if the statutory transport
            details must match the new values.
          </div>
        ) : null}

        <GoodsTransportStatutorySection
          value={transport}
          onChange={(patch) => setTransport((prev) => ({ ...prev, ...patch }))}
          hideDistance={hideDistance}
        />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => onSave(transportStateToPayload(transport))}
          >
            {saving ? "Saving…" : "Save transporter details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
