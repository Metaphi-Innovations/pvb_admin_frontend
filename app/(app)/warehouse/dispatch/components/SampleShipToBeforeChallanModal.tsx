"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SampleOrderService } from "@/services/sample-order.service";
import {
  emptySampleShipTo,
  sampleShipToToPayload,
  type SampleShipToForm,
} from "@/app/(app)/sales/sample-order/orders-data";
import { getErrorMessage } from "@/lib/masters/master-query-errors";

type Props = {
  open: boolean;
  sampleOrderId: string | null;
  withGoodsValue: boolean;
  onClose: () => void;
  onContinue: (withGoodsValue: boolean) => void;
};

export function SampleShipToBeforeChallanModal({
  open,
  sampleOrderId,
  withGoodsValue,
  onClose,
  onContinue,
}: Props) {
  const [shipTo, setShipTo] = useState<SampleShipToForm>(emptySampleShipTo());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState("");

  useEffect(() => {
    if (!open || !sampleOrderId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    SampleOrderService.getById(sampleOrderId)
      .then((order) => {
        if (cancelled) return;
        setOrderNo(order.soNumber || "");
        setShipTo({
          name: order.shipTo?.name || order.salesManName || "",
          address: order.shipTo?.address || "",
          city: order.shipTo?.city || "",
          state: order.shipTo?.state || "",
          pincode: order.shipTo?.pincode || "",
          mobile: order.shipTo?.mobile || "",
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err, "Failed to load sample order Ship To."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, sampleOrderId]);

  const setField = (key: keyof SampleShipToForm, value: string) => {
    setShipTo((prev) => ({ ...prev, [key]: value }));
  };

  const handleContinue = async () => {
    if (!sampleOrderId) return;
    const payload = sampleShipToToPayload(shipTo);
    if (!payload?.address && !payload?.city && !payload?.name) {
      setError("Enter at least Ship To name or address before downloading the Delivery Challan.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await SampleOrderService.updateShipTo(sampleOrderId, payload);
      onContinue(withGoodsValue);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save Ship To address."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm Ship To for Delivery Challan</DialogTitle>
          <DialogDescription>
            Bill To stays Paramverse HO. Enter the TM visit / delivery address for
            {orderNo ? ` ${orderNo}` : " this sample dispatch"} before downloading the challan.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6">Loading address…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={shipTo.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="TM / recipient name"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Address</Label>
              <Input
                value={shipTo.address}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="Visit / delivery address"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">City</Label>
              <Input value={shipTo.city} onChange={(e) => setField("city", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">State</Label>
              <Input value={shipTo.state} onChange={(e) => setField("state", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pincode</Label>
              <Input value={shipTo.pincode} onChange={(e) => setField("pincode", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mobile</Label>
              <Input value={shipTo.mobile} onChange={(e) => setField("mobile", e.target.value)} />
            </div>
          </div>
        )}

        {error ? <p className="text-xs text-red-600">{error}</p> : null}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleContinue()} disabled={loading || saving}>
            {saving ? "Saving…" : "Save & Continue to Challan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
