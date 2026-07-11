"use client";

import { Textarea } from "@/components/ui/textarea";
import {
  VOUCHER_FIELD_NARRATION,
  VOUCHER_FORM_CARD,
  VOUCHER_INPUT_CLASS,
  VoucherFormSection,
} from "@/components/accounts/voucher-simple-form-ui";
import { cn } from "@/lib/utils";

export interface VoucherNarrationSectionProps {
  narration: string;
  readOnly?: boolean;
  onChange: (narration: string) => void;
  className?: string;
}

export function VoucherNarrationSection({
  narration,
  readOnly = false,
  onChange,
  className,
}: VoucherNarrationSectionProps) {
  return (
    <div className={cn(VOUCHER_FORM_CARD, "mt-3", className)}>
      <VoucherFormSection title="Narration">
        <Textarea
          className={cn(VOUCHER_INPUT_CLASS, "min-h-[72px] max-h-32 h-auto py-2 resize-y", VOUCHER_FIELD_NARRATION)}
          rows={3}
          value={narration}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Optional narration…"
          maxLength={500}
          disabled={readOnly}
        />
      </VoucherFormSection>
    </div>
  );
}
