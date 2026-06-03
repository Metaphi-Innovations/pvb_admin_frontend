import {
  MASTER_CURRENT_USER,
  masterToday,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";

export const SEGMENT_STORAGE_KEY = "ds_master_segment_v1";

export interface SegmentRecord extends BaseMasterRecord {
  segmentName: string;
  segmentCode: string;
  description: string;
}

export interface SegmentForm {
  segmentName: string;
  segmentCode: string;
  description: string;
  status: MasterStatus;
}

export const DEFAULT_SEGMENT_FORM: SegmentForm = {
  segmentName: "",
  segmentCode: "",
  description: "",
  status: "active",
};

export const SEGMENT_SEED: SegmentRecord[] = [
  { id: 1, segmentName: "Retail", segmentCode: "SEG-001", description: "Retail channel", status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-10", updatedAt: "2024-01-10" },
  { id: 2, segmentName: "Institutional", segmentCode: "SEG-002", description: "Institutional buyers", status: "active", createdBy: "Admin", updatedBy: "Admin", createdAt: "2024-01-12", updatedAt: "2024-01-12" },
];

export function segmentToForm(r: SegmentRecord): SegmentForm {
  return { segmentName: r.segmentName, segmentCode: r.segmentCode, description: r.description, status: r.status };
}

export function formToSegment(form: SegmentForm, id: number, existing?: SegmentRecord): SegmentRecord {
  const now = masterToday();
  return {
    id,
    segmentName: form.segmentName.trim(),
    segmentCode: form.segmentCode.trim(),
    description: form.description.trim(),
    status: form.status,
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function validateSegmentForm(form: SegmentForm): string | null {
  if (!form.segmentName.trim()) return "Segment name is required.";
  if (!form.segmentCode.trim()) return "Segment code is required.";
  return null;
}
