"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FLabel, ProcInput } from "../../design/proc-design";
import type { PurchaseOrder } from "../po-data";
import { nowDateTimeLocal, type AddFollowUpInput } from "../po-followup-data";

export function AddFollowUpModal({
  open,
  onOpenChange,
  po,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  po: PurchaseOrder | null;
  onSubmit: (input: AddFollowUpInput) => void;
}) {
  const [followUpAt, setFollowUpAt] = useState(nowDateTimeLocal());
  const [spokeWith, setSpokeWith] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setFollowUpAt(nowDateTimeLocal());
      setSpokeWith("");
      setRemarks("");
      setError("");
    }
  }, [open, po?.id]);

  if (!po) return null;

  const submit = () => {
    if (!remarks.trim()) {
      setError("Remarks are required.");
      return;
    }
    onSubmit({
      followUpAt,
      spokeWith: spokeWith.trim(),
      remarks: remarks.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm z-[400]">
        <DialogHeader>
          <DialogTitle className="text-sm">Add Follow-up</DialogTitle>
          <p className="text-[11px] text-muted-foreground">{po.poNumber}</p>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div>
            <FLabel>Follow-up Date &amp; Time *</FLabel>
            <ProcInput
              type="datetime-local"
              value={followUpAt}
              onChange={(e) => setFollowUpAt(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <FLabel>Spoke With</FLabel>
            <ProcInput
              value={spokeWith}
              onChange={(e) => setSpokeWith(e.target.value)}
              className="w-full"
              placeholder="Rajesh Patel, Dispatch Team…"
            />
          </div>

          <div>
            <Label className="text-xs">Remarks *</Label>
            <Textarea
              className="text-xs min-h-[88px] mt-1"
              value={remarks}
              onChange={(e) => { setRemarks(e.target.value); setError(""); }}
              placeholder="What was discussed with the supplier?"
            />
          </div>

          {error && <p className="text-[11px] text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={submit}>
            Save Follow-up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
