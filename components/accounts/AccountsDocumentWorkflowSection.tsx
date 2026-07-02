"use client";

import { useCallback, useState } from "react";
import { AccountsMakerCheckerPanel } from "./AccountsMakerCheckerPanel";
import {
  ensureDocumentWorkflow,
  type AccountsDocumentWorkflow,
  type AccountsVoucherCategory,
} from "@/lib/accounts/accounts-maker-checker";
import {
  approveDocumentStep,
  initDocumentWorkflowIfMissing,
  rejectDocument,
  sendBackDocument,
  submitDocumentForApproval,
} from "@/lib/accounts/accounts-workflow-persist";

export interface AccountsDocumentWorkflowSectionProps {
  category: AccountsVoucherCategory;
  documentId: number;
  workflow?: AccountsDocumentWorkflow;
  legacyStatus?: string;
  readOnly?: boolean;
  reviewMode?: boolean;
  onUpdated?: () => void;
  onSaveDraft?: () => void;
  onDuplicate?: () => void;
}

export function AccountsDocumentWorkflowSection({
  category,
  documentId,
  workflow,
  legacyStatus,
  readOnly,
  reviewMode,
  onUpdated,
  onSaveDraft,
  onDuplicate,
}: AccountsDocumentWorkflowSectionProps) {
  const [saving, setSaving] = useState(false);
  const resolved = ensureDocumentWorkflow(
    workflow ?? initDocumentWorkflowIfMissing(category, documentId),
  );

  const run = useCallback(
    async (action: () => AccountsDocumentWorkflow) => {
      setSaving(true);
      try {
        action();
        onUpdated?.();
      } finally {
        setSaving(false);
      }
    },
    [onUpdated],
  );

  return (
    <AccountsMakerCheckerPanel
      workflow={resolved}
      legacyStatus={legacyStatus}
      readOnly={readOnly}
      reviewMode={reviewMode}
      saving={saving}
      onSaveDraft={onSaveDraft}
      onSubmitForApproval={(remarks) =>
        run(() => submitDocumentForApproval(category, documentId, remarks))
      }
      onResubmit={(remarks) =>
        run(() => submitDocumentForApproval(category, documentId, remarks))
      }
      onApprove={(remarks) => run(() => approveDocumentStep(category, documentId, remarks))}
      onReject={(remarks) => run(() => rejectDocument(category, documentId, remarks))}
      onSendBack={(remarks) => run(() => sendBackDocument(category, documentId, remarks))}
      onDuplicate={onDuplicate}
    />
  );
}
