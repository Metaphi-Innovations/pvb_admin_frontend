import type { EventTypeListRecord } from "@/services/event-type-list.service";

export type EventTypeStatus = "active" | "inactive";

export interface EventTypeRecord {
  id: number;
  eventTypeUuid: string;
  eventTypeName: string;
  remark: string;
  status: EventTypeStatus;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface EventTypeForm {
  eventTypeName: string;
  remark: string;
}

export const DEFAULT_EVENT_TYPE_FORM: EventTypeForm = {
  eventTypeName: "",
  remark: "",
};

export function toEventTypeRecord(item: EventTypeListRecord): EventTypeRecord {
  return {
    id: item.id,
    eventTypeUuid: item.eventTypeUuid,
    eventTypeName: item.eventTypeName,
    remark: item.remark,
    status: item.status,
    createdBy: item.createdBy || "—",
    createdAt: item.createdAt,
    updatedBy: item.updatedBy || "—",
    updatedAt: item.updatedAt,
  };
}

export function eventTypeToForm(record: EventTypeRecord): EventTypeForm {
  return {
    eventTypeName: record.eventTypeName,
    remark: record.remark,
  };
}

export function validateEventTypeApiForm(form: EventTypeForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.eventTypeName.trim()) errors.eventTypeName = "Event type name is required";
  return errors;
}
