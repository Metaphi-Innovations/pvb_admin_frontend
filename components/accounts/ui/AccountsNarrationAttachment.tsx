"use client";

import {
  VoucherNarrationAttachmentsSection,
  type VoucherNarrationAttachmentsSectionProps,
} from "@/components/accounts/voucher-form/VoucherNarrationAttachmentsSection";
import {
  VoucherAttachmentSection,
  type VoucherAttachmentFile,
  type VoucherAttachmentSectionProps,
} from "@/components/accounts/voucher-form/VoucherAttachmentSection";

export type { VoucherAttachmentFile };

/** Standard narration + attachments (left/right on desktop). */
export function AccountsNarrationSection(props: VoucherNarrationAttachmentsSectionProps) {
  return <VoucherNarrationAttachmentsSection {...props} />;
}

/** Attachment upload + file list only. */
export function AccountsAttachmentSection(props: VoucherAttachmentSectionProps) {
  return <VoucherAttachmentSection {...props} />;
}
