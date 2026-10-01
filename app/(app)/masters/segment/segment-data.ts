import {
  MASTER_CURRENT_USER,
  masterToday,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";

export const SEGMENT_STORAGE_KEY = "ds_master_segment_v2";

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
  {
    id: 1,
    segmentName: "Rakshak",
    segmentCode: "SEG-001",
    description: "",
    status: "active",
    createdBy: "Admin User",
    updatedBy: "Admin User",
    createdAt: "2024-01-10",
    updatedAt: "2024-01-10",
  },
  {
    id: 2,
    segmentName: "Poshak",
    segmentCode: "SEG-002",
    description: "",
    status: "active",
    createdBy: "Admin User",
    updatedBy: "Admin User",
    createdAt: "2024-01-12",
    updatedAt: "2024-01-12",
  },
  {
    id: 3,
    segmentName: "Amritam",
    segmentCode: "SEG-003",
    description: "",
    status: "active",
    createdBy: "Admin User",
    updatedBy: "Admin User",
    createdAt: "2024-01-15",
    updatedAt: "2024-01-15",
  },
];

export function segmentToForm(r: SegmentRecord): SegmentForm {
  return {
    segmentName: r.segmentName,
    segmentCode: r.segmentCode,
    description: r.description,
    status: r.status,
  };
}

export function formToSegment(
  form: SegmentForm,
  id: number,
  existing?: SegmentRecord,
): SegmentRecord {
  const now = masterToday();
  return {
    id,
    segmentName: form.segmentName.trim(),
    segmentCode: form.segmentCode.trim().toUpperCase(),
    description: form.description.trim(),
    status: form.status,
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    updatedBy: "Admin User",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function findSegmentDuplicate(
  code: string,
  records: SegmentRecord[],
  excludeId?: number,
): SegmentRecord | undefined {
  const normalized = code.trim().toUpperCase();
  return records.find(
    (r) => r.id !== excludeId && r.segmentCode.trim().toUpperCase() === normalized,
  );
}

export function validateSegmentForm(
  form: SegmentForm,
  records: SegmentRecord[],
  excludeId?: number,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.segmentName.trim()) {
    errors.segmentName = "Segment name is required.";
  }
  return errors;
}
