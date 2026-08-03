import type { GrnRecord } from "@/app/(app)/warehouse/grn/types";

export type DocumentStatusValue = "linked" | "pending" | "uploaded" | "completed" | "in_progress";

export interface GrnDocumentStatus {
  purchaseOrder: { label: "Linked" | "Pending"; value: DocumentStatusValue };
  deliveryChallan: { label: "Uploaded" | "Pending"; value: DocumentStatusValue };
  supplierInvoice: { label: "Uploaded" | "Pending"; value: DocumentStatusValue };
  ocrExtraction: { label: "Completed" | "Pending"; value: DocumentStatusValue };
  qcStatus: { label: "Pending QC" | "Completed"; value: DocumentStatusValue };
}

export function getGrnDocumentStatus(grn: GrnRecord): GrnDocumentStatus {
  const hasPo = Boolean(grn.poNumber?.trim());
  const hasChallan = Boolean(grn.deliveryChallan?.trim() || grn.deliveryChallanFileName);
  const hasInvoice =
    (grn.supplierInvoices?.length ?? 0) > 0 ||
    (grn.invoiceFileNames?.length ?? 0) > 0 ||
    Boolean(grn.invoiceNumber) ||
    Boolean(grn.invoiceFileName);
  const ocrDone =
    grn.ocrExtractionCompleted ||
    (grn.ocrExtractedInvoices?.length ?? 0) > 0;

  const qcCompleted = grn.status === "qc_completed";

  return {
    purchaseOrder: {
      label: hasPo ? "Linked" : "Pending",
      value: hasPo ? "linked" : "pending",
    },
    deliveryChallan: {
      label: hasChallan ? "Uploaded" : "Pending",
      value: hasChallan ? "uploaded" : "pending",
    },
    supplierInvoice: {
      label: hasInvoice ? "Uploaded" : "Pending",
      value: hasInvoice ? "uploaded" : "pending",
    },
    ocrExtraction: {
      label: ocrDone ? "Completed" : "Pending",
      value: ocrDone ? "completed" : "pending",
    },
    qcStatus: {
      label: qcCompleted ? "Completed" : "Pending QC",
      value: qcCompleted ? "completed" : "pending",
    },
  };
}
