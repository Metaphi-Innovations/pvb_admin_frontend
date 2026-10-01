import { CURRENT_USER } from "@/lib/procurement/config";
import {
  type PurchaseRequest,
  recalcPR,
  submitPR,
  nextId,
  todayStr,
} from "../pr-data";
import type { PRFormValues } from "./PurchaseRequestForm";

export function formToPR(
  form: PRFormValues,
  meta: {
    id: number;
    prNumber: string;
    status: PurchaseRequest["status"];
    createdBy: string;
    createdDate: string;
    activity: PurchaseRequest["activity"];
    convertedPoIds?: number[];
    approvedBy?: string;
    approvedDate?: string;
  },
): PurchaseRequest {
  return recalcPR({
    id: meta.id,
    prNumber: meta.prNumber,
    prDate: form.prDate,
    requestedBy: form.requestedBy,
    department: form.department,
    priority: form.priority,
    state: form.state,
    warehouseId: form.warehouseId,
    warehouseName: form.warehouseName,
    requiredByDate: form.requiredByDate,
    purpose: form.purpose,
    remarks: form.remarks,
    status: meta.status,
    lines: form.lines.filter((l) => l.productId > 0),
    attachments: form.attachments,
    convertedPoIds: meta.convertedPoIds ?? [],
    createdBy: meta.createdBy,
    createdDate: meta.createdDate,
    updatedBy: CURRENT_USER,
    updatedDate: todayStr(),
    approvedBy: meta.approvedBy ?? "",
    approvedDate: meta.approvedDate ?? "",
    activity: meta.activity,
  });
}

export { submitPR, nextId, todayStr };
