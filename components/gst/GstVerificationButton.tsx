"use client";

import React, { useCallback, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { validateGSTIN } from "@/lib/masters/gst-compliance";
import { verifyGstinApi } from "@/services/gst-verification.service";
import { GstVerificationDialog } from "./GstVerificationDialog";
import type {
  GstAutoFillPayload,
  GstVerificationDetails,
} from "./gst.types";

export function GstVerificationButton({
  gstin,
  onAutoFill,
  onCancel,
  onError,
  disabled,
  className,
  label = "Verify GSTIN",
  verifyingLabel = "Verifying GSTIN...",
}: {
  gstin: string;
  onAutoFill: (payload: GstAutoFillPayload) => void;
  onCancel?: () => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  verifyingLabel?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<GstVerificationDetails | null>(null);

  const handleVerify = useCallback(async () => {
    if (loading || disabled) return;

    const normalized = gstin.trim().toUpperCase();
    if (!normalized) {
      onError?.("Please enter a valid GSTIN.");
      return;
    }
    if (!validateGSTIN(normalized)) {
      onError?.("Please enter a valid GSTIN.");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyGstinApi(normalized);
      setDetails(result);
      setOpen(true);
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "GSTIN verification failed.",
      );
    } finally {
      setLoading(false);
    }
  }, [disabled, gstin, loading, onError]);

  return (
    <>
      <Button
        type="button"
        size="sm"
        className={cn(
          "h-8 w-auto shrink-0 whitespace-nowrap px-2.5 text-xs bg-brand-600 hover:bg-brand-700 text-white",
          className,
        )}
        disabled={disabled || loading}
        onClick={handleVerify}
      >
        {loading ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <Search className="mr-1 h-3 w-3" />
        )}
        {loading ? verifyingLabel : label}
      </Button>

      <GstVerificationDialog
        open={open}
        details={details}
        onOpenChange={setOpen}
        onAutoFill={onAutoFill}
        onCancel={onCancel}
      />
    </>
  );
}

/** Imperative helper for forms that already own a Fetch/Verify button. */
export function useGstVerificationFlow(options: {
  onAutoFill: (payload: GstAutoFillPayload) => void;
  onError?: (message: string) => void;
  onCancel?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<GstVerificationDetails | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const verify = useCallback(async (gstin: string) => {
    if (loading) return;

    const normalized = gstin.trim().toUpperCase();
    if (!normalized || !validateGSTIN(normalized)) {
      optionsRef.current.onError?.("Please enter a valid GSTIN.");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyGstinApi(normalized);
      setDetails(result);
      setOpen(true);
    } catch (error) {
      optionsRef.current.onError?.(
        error instanceof Error ? error.message : "GSTIN verification failed.",
      );
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const dialog = (
    <GstVerificationDialog
      open={open}
      details={details}
      onOpenChange={setOpen}
      onAutoFill={(payload) => optionsRef.current.onAutoFill(payload)}
      onCancel={() => optionsRef.current.onCancel?.()}
    />
  );

  return { loading, verify, dialog, open, details };
}
