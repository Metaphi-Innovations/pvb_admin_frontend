"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import {
  VoucherAttachmentSection,
  type VoucherAttachmentFile,
} from "@/components/accounts/voucher-form/VoucherAttachmentSection";

export interface VoucherNarrationAttachmentsSectionProps {
  narration: string;
  onNarrationChange: (value: string) => void;
  readOnly?: boolean;
  narrationPlaceholder?: string;
  maxLength?: number;
  /** Attachment files (UI-only or caller-persisted). Always shown. */
  attachmentFiles?: VoucherAttachmentFile[];
  onAddAttachmentFiles?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  /** Credit Note: keep a single file. */
  singleAttachment?: boolean;
  className?: string;
  /** Credit / Debit Note density. Default false for other vouchers. */
  compact?: boolean;
  /** Optional content rendered below narration/attachments (e.g. posting summary). */
  footerSlot?: React.ReactNode;
}

/**
 * Narration + Attachments card for the six voucher modules.
 * Desktop: narration left, attachments right. Mobile: stacked.
 */
export function VoucherNarrationAttachmentsSection({
  narration,
  onNarrationChange,
  readOnly = false,
  narrationPlaceholder = "Optional narration…",
  maxLength = 500,
  attachmentFiles = [],
  onAddAttachmentFiles,
  onRemoveAttachment,
  singleAttachment = false,
  className,
  compact = false,
  footerSlot,
}: VoucherNarrationAttachmentsSectionProps) {
  return (
    <VoucherFormSectionCard
      title={compact ? "Narration & Attachments" : "Narration and Attachments"}
      className={className}
      compact={compact}
    >
      <div className={cn("grid grid-cols-1 md:grid-cols-2", compact ? "gap-2.5" : "gap-3")}>
        <div className={cn("min-w-0", compact ? "space-y-1" : "space-y-1.5")}>
          <Label className={cn(compact ? "text-[11px] font-medium text-muted-foreground" : "text-xs font-medium")}>
            Narration
          </Label>
          <Textarea
            className={cn(
              "resize-y rounded-lg border border-border",
              compact
                ? "min-h-[56px] max-h-20 h-auto py-1.5 text-xs focus-visible:ring-1 focus-visible:ring-brand-300 focus-visible:border-brand-400"
                : "min-h-[72px] max-h-28 h-auto py-2 text-sm focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400",
            )}
            rows={compact ? 2 : 3}
            value={narration}
            onChange={(e) => onNarrationChange(e.target.value)}
            placeholder={narrationPlaceholder}
            maxLength={maxLength}
            disabled={readOnly}
          />
        </div>

        <VoucherAttachmentSection
          files={attachmentFiles}
          readOnly={readOnly || !onAddAttachmentFiles}
          single={singleAttachment}
          onAddFiles={onAddAttachmentFiles ?? (() => undefined)}
          onRemove={onRemoveAttachment ?? (() => undefined)}
        />
      </div>
      {footerSlot ? (
        <div className={cn(compact ? "mt-2.5 pt-2.5 border-t border-border/60" : "mt-3 pt-3 border-t border-border")}>
          {footerSlot}
        </div>
      ) : null}
    </VoucherFormSectionCard>
  );
}
