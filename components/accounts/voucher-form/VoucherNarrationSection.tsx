"use client";

import { Textarea } from "@/components/ui/textarea";
import {
  RECEIPT_INPUT_CLASS,
  RECEIPT_NARRATION_INPUT,
  RECEIPT_VOUCHER_FORM_CARD,
  VOUCHER_FIELD_NARRATION,
  VOUCHER_FORM_CARD,
  VOUCHER_INPUT_CLASS,
  ReceiptFormSection,
  VoucherFormSection,
} from "@/components/accounts/voucher-simple-form-ui";
import { cn } from "@/lib/utils";

export interface VoucherNarrationSectionProps {
  narration: string;
  readOnly?: boolean;
  onChange: (narration: string) => void;
  className?: string;
  variant?: "default" | "premium";
}

export function VoucherNarrationSection({
  narration,
  readOnly = false,
  onChange,
  className,
  variant = "default",
}: VoucherNarrationSectionProps) {
  const textarea = (
    <Textarea
      className={cn(
        variant === "premium" ? RECEIPT_INPUT_CLASS : VOUCHER_INPUT_CLASS,
        variant === "premium" ? RECEIPT_NARRATION_INPUT : "min-h-[72px] max-h-32 h-auto py-2 resize-y",
        VOUCHER_FIELD_NARRATION,
      )}
      rows={3}
      value={narration}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Optional narration…"
      maxLength={500}
      disabled={readOnly}
    />
  );

  if (variant === "premium") {
    return (
      <div className={cn(RECEIPT_VOUCHER_FORM_CARD, className)}>
        <ReceiptFormSection title="Narration">{textarea}</ReceiptFormSection>
      </div>
    );
  }

  return (
    <div className={cn(VOUCHER_FORM_CARD, "mt-3", className)}>
      <VoucherFormSection title="Narration">{textarea}</VoucherFormSection>
    </div>
  );
}
