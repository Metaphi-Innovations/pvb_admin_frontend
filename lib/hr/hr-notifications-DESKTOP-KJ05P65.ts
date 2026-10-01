/**
 * Central HR Notifications — frontend prototype.
 * CLOSED CORE: event configuration + in-app delivery via createHrNotification.
 *
 * FUTURE infrastructure (not blockers): real email delivery, push, SMS, WhatsApp,
 * background reminder scheduler.
 *
 * Settings + in-app history in localStorage. No scheduler, SMTP, or APIs.
 */

import { getHrEmployeeById, loadHrEmployees, type HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import { loadRoles } from "@/app/(app)/user-management/roles/roles-data";
import { loadUsers, type UserRecord } from "@/app/(app)/user-management/user/user-data";
import { CURRENT_USER } from "@/lib/hr/config";

const CLAIM_ACTOR_KEY = "ds_hr_travel_claim_actor_v1";

export const HR_NOTIFICATION_SETTINGS_KEY = "ds_hr_notification_settings_v1";
export const HR_NOTIFICATIONS_KEY = "ds_hr_notifications_v1";
export const HR_NOTIFICATION_INBOX_KEY = "ds_hr_notification_inbox_v1";
export const HR_NOTIFICATIONS_EVENT = "hr-notifications-updated";
export const HR_NOTIFICATION_SETTINGS_EVENT = "hr-notification-settings-updated";

export type RecipientKind =
  | "employee"
  | "reporting_manager"
  | "hr"
  | "finance"
  | "admin"
  | "specific_role"
  | "specific_user";

export interface NotificationRecipient {
  kind: RecipientKind;
  roleId?: number;
  roleName?: string;
  userId?: number;
  userName?: string;
}

export type ReminderTiming =
  | "1_day_before"
  | "2_days_before"
  | "3_days_before"
  | "on_due_date"
  | "every_day_until_completed";

export type ReminderRepeat = "daily" | "every_2_days" | "weekly";

export type EventAvailability = "available" | "unavailable";

export type EventGroupId =
  | "lifecycle"
  | "attendance_leave"
  | "payroll"
  | "reimbursements"
  | "letters"
  | "offboarding";

export type HrNotificationEventType =
  | "employee_created"
  | "employee_invitation_sent"
  | "employee_joining_today"
  | "employee_joining_tomorrow"
  | "probation_ending_soon"
  | "employee_confirmation_due"
  | "birthday"
  | "work_anniversary"
  | "onboarding_started"
  | "document_pending"
  | "mandatory_document_missing"
  | "joining_checklist_pending"
  | "welcome_communication"
  | "missed_punch"
  | "late_arrival"
  | "early_going"
  | "attendance_regularization_required"
  | "attendance_regularization_approved"
  | "attendance_regularization_rejected"
  | "leave_applied"
  | "leave_approved"
  | "leave_rejected"
  | "payroll_ready_for_review"
  | "payroll_finalized"
  | "payslip_generated"
  | "payslip_available"
  | "claim_submitted"
  | "claim_returned"
  | "claim_approved"
  | "claim_partially_approved"
  | "claim_rejected"
  | "exception_approval_required"
  | "claim_awaiting_finance_processing"
  | "claim_queued_for_payroll"
  | "claim_ready_for_accounts"
  | "claim_sent_to_accounts"
  | "reimbursement_processed"
  | "travel_request_submitted"
  | "travel_request_pending_approval"
  | "travel_request_returned"
  | "travel_request_approved"
  | "travel_request_rejected"
  | "hr_letter_generated"
  | "hr_letter_issued"
  | "offboarding_initiated"
  | "resignation_submitted"
  | "resignation_accepted"
  | "resignation_rejected"
  | "handover_pending"
  | "asset_return_pending"
  | "clearance_pending"
  | "last_working_date_approaching"
  | "offboarding_ready_for_completion"
  | "offboarding_completed";

export interface EventDefinition {
  type: HrNotificationEventType;
  name: string;
  group: EventGroupId;
  placeholders: string[];
  supportsReminder: boolean;
  supportsRepeat: boolean;
  availability: EventAvailability;
  unavailableReason?: string;
  defaultActive: boolean;
  defaultRecipients: NotificationRecipient[];
  defaultInApp: boolean;
  defaultEmail: boolean;
  defaultTitle: string;
  defaultMessage: string;
  defaultEmailSubject: string;
  defaultEmailBody: string;
  sourceModule: string;
  defaultReminderTiming?: ReminderTiming;
}

export interface HrNotificationEventConfig {
  eventType: HrNotificationEventType;
  active: boolean;
  recipients: NotificationRecipient[];
  inAppEnabled: boolean;
  inAppTitle: string;
  inAppMessage: string;
  emailEnabled: boolean;
  emailSubject: string;
  emailBody: string;
  reminderEnabled: boolean;
  reminderTiming: ReminderTiming;
  reminderRepeat: ReminderRepeat | "";
}

export type EmailChannelStatus = "off" | "pending_integration";
export type InAppChannelStatus = "off" | "delivered";

export interface HrInAppNotification {
  id: string;
  recipientKey: string;
  recipientLabel: string;
  eventType: HrNotificationEventType;
  title: string;
  message: string;
  sourceModule: string;
  sourceId: string;
  sourceHref: string;
  createdAt: string;
  readAt: string | null;
  channelStatus: {
    inApp: InAppChannelStatus;
    email: EmailChannelStatus;
  };
}

export type InboxView =
  | { mode: "session" }
  | { mode: "employee"; employeeId: number }
  | { mode: "role"; key: string };

export const EVENT_GROUPS: { id: EventGroupId; label: string }[] = [
  { id: "lifecycle", label: "Employee Lifecycle" },
  { id: "attendance_leave", label: "Attendance & Leave" },
  { id: "payroll", label: "Payroll" },
  { id: "reimbursements", label: "Reimbursements" },
  { id: "letters", label: "HR Letters & Documents" },
  { id: "offboarding", label: "Offboarding" },
];

export const RECIPIENT_KIND_OPTIONS: { kind: RecipientKind; label: string }[] = [
  { kind: "employee", label: "Employee" },
  { kind: "reporting_manager", label: "Reporting Manager" },
  { kind: "hr", label: "HR" },
  { kind: "finance", label: "Finance" },
  { kind: "admin", label: "Admin" },
  { kind: "specific_role", label: "Specific Role" },
  { kind: "specific_user", label: "Specific User" },
];

export const REMINDER_TIMING_OPTIONS: { value: ReminderTiming; label: string }[] = [
  { value: "1_day_before", label: "1 day before" },
  { value: "2_days_before", label: "2 days before" },
  { value: "3_days_before", label: "3 days before" },
  { value: "on_due_date", label: "On due date" },
  { value: "every_day_until_completed", label: "Every day until completed" },
];

export const REMINDER_REPEAT_OPTIONS: { value: ReminderRepeat; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "every_2_days", label: "Every 2 days" },
  { value: "weekly", label: "Weekly" },
];

const R = (kind: RecipientKind): NotificationRecipient => ({ kind });

function def(partial: EventDefinition): EventDefinition {
  return partial;
}

export const EVENT_CATALOG: EventDefinition[] = [
  def({
    type: "employee_created",
    name: "Employee Created",
    group: "lifecycle",
    placeholders: ["employee_name", "employee_code"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("hr")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "New employee created",
    defaultMessage: "{{employee_name}} ({{employee_code}}) was added to the employee directory.",
    defaultEmailSubject: "New employee: {{employee_name}}",
    defaultEmailBody: "{{employee_name}} ({{employee_code}}) was added to the employee directory.",
    sourceModule: "employees",
  }),
  def({
    type: "employee_invitation_sent",
    name: "Employee Invitation Sent",
    group: "lifecycle",
    placeholders: ["employee_name", "employee_code"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "unavailable",
    unavailableReason: "Employee invitation workflow is not implemented.",
    defaultActive: false,
    defaultRecipients: [R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Invitation sent",
    defaultMessage: "An invitation was sent to {{employee_name}}.",
    defaultEmailSubject: "Invitation sent — {{employee_name}}",
    defaultEmailBody: "An invitation was sent to {{employee_name}} ({{employee_code}}).",
    sourceModule: "employees",
  }),
  def({
    type: "employee_joining_today",
    name: "Employee Joining Today",
    group: "lifecycle",
    placeholders: ["employee_name", "employee_code", "joining_date"],
    supportsReminder: true,
    supportsRepeat: false,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("hr"), R("reporting_manager")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Joining today",
    defaultMessage: "{{employee_name}} is joining today ({{joining_date}}).",
    defaultEmailSubject: "{{employee_name}} joins today",
    defaultEmailBody: "{{employee_name}} ({{employee_code}}) is joining today ({{joining_date}}).",
    sourceModule: "employees",
    defaultReminderTiming: "on_due_date",
  }),
  def({
    type: "employee_joining_tomorrow",
    name: "Employee Joining Tomorrow",
    group: "lifecycle",
    placeholders: ["employee_name", "employee_code", "joining_date"],
    supportsReminder: true,
    supportsRepeat: false,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("hr"), R("reporting_manager")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Joining tomorrow",
    defaultMessage: "{{employee_name}} joins tomorrow ({{joining_date}}).",
    defaultEmailSubject: "{{employee_name}} joins tomorrow",
    defaultEmailBody: "{{employee_name}} ({{employee_code}}) joins tomorrow ({{joining_date}}).",
    sourceModule: "employees",
    defaultReminderTiming: "1_day_before",
  }),
  def({
    type: "probation_ending_soon",
    name: "Probation Ending Soon",
    group: "lifecycle",
    placeholders: ["employee_name", "employee_code"],
    supportsReminder: true,
    supportsRepeat: false,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("hr"), R("reporting_manager")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Probation ending soon",
    defaultMessage: "Probation for {{employee_name}} is ending soon.",
    defaultEmailSubject: "Probation ending — {{employee_name}}",
    defaultEmailBody: "Probation for {{employee_name}} ({{employee_code}}) is ending soon.",
    sourceModule: "employees",
    defaultReminderTiming: "3_days_before",
  }),
  def({
    type: "employee_confirmation_due",
    name: "Employee Confirmation Due",
    group: "lifecycle",
    placeholders: ["employee_name", "employee_code"],
    supportsReminder: true,
    supportsRepeat: false,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("hr")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Confirmation due",
    defaultMessage: "Confirmation is due for {{employee_name}}.",
    defaultEmailSubject: "Confirmation due — {{employee_name}}",
    defaultEmailBody: "Confirmation is due for {{employee_name}} ({{employee_code}}).",
    sourceModule: "employees",
    defaultReminderTiming: "3_days_before",
  }),
  def({
    type: "birthday",
    name: "Birthday",
    group: "lifecycle",
    placeholders: ["employee_name"],
    supportsReminder: true,
    supportsRepeat: false,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("hr"), R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Birthday",
    defaultMessage: "Wish {{employee_name}} a happy birthday.",
    defaultEmailSubject: "Happy birthday, {{employee_name}}",
    defaultEmailBody: "Today is {{employee_name}}'s birthday.",
    sourceModule: "employees",
    defaultReminderTiming: "on_due_date",
  }),
  def({
    type: "work_anniversary",
    name: "Work Anniversary",
    group: "lifecycle",
    placeholders: ["employee_name"],
    supportsReminder: true,
    supportsRepeat: false,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("hr"), R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Work anniversary",
    defaultMessage: "Today is {{employee_name}}'s work anniversary.",
    defaultEmailSubject: "Work anniversary — {{employee_name}}",
    defaultEmailBody: "Today is {{employee_name}}'s work anniversary.",
    sourceModule: "employees",
    defaultReminderTiming: "on_due_date",
  }),
  def({
    type: "onboarding_started",
    name: "Onboarding Started",
    group: "lifecycle",
    placeholders: ["employee_name", "employee_code", "joining_date"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("hr"), R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Onboarding started",
    defaultMessage: "Onboarding has started for {{employee_name}}.",
    defaultEmailSubject: "Onboarding started — {{employee_name}}",
    defaultEmailBody: "Onboarding has started for {{employee_name}} ({{employee_code}}).",
    sourceModule: "onboarding",
  }),
  def({
    type: "document_pending",
    name: "Document Pending",
    group: "lifecycle",
    placeholders: ["employee_name", "document_name"],
    supportsReminder: true,
    supportsRepeat: true,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("employee"), R("hr")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Document pending",
    defaultMessage: "{{employee_name}} still needs to submit {{document_name}}.",
    defaultEmailSubject: "Document pending — {{employee_name}}",
    defaultEmailBody: "{{employee_name}} still needs to submit {{document_name}}.",
    sourceModule: "onboarding",
    defaultReminderTiming: "every_day_until_completed",
  }),
  def({
    type: "mandatory_document_missing",
    name: "Mandatory Document Missing",
    group: "lifecycle",
    placeholders: ["employee_name", "document_name"],
    supportsReminder: true,
    supportsRepeat: true,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("employee"), R("hr")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Mandatory document missing",
    defaultMessage: "Mandatory document {{document_name}} is missing for {{employee_name}}.",
    defaultEmailSubject: "Mandatory document missing — {{employee_name}}",
    defaultEmailBody: "Mandatory document {{document_name}} is missing for {{employee_name}}.",
    sourceModule: "onboarding",
    defaultReminderTiming: "every_day_until_completed",
  }),
  def({
    type: "joining_checklist_pending",
    name: "Joining Checklist Pending",
    group: "lifecycle",
    placeholders: ["employee_name"],
    supportsReminder: true,
    supportsRepeat: true,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("hr"), R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Joining checklist pending",
    defaultMessage: "Joining checklist is still pending for {{employee_name}}.",
    defaultEmailSubject: "Joining checklist pending — {{employee_name}}",
    defaultEmailBody: "Joining checklist is still pending for {{employee_name}}.",
    sourceModule: "onboarding",
    defaultReminderTiming: "every_day_until_completed",
  }),
  def({
    type: "welcome_communication",
    name: "Welcome Communication Generated/Scheduled",
    group: "lifecycle",
    placeholders: ["employee_name", "employee_code"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("employee"), R("hr")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Welcome communication",
    defaultMessage: "Welcome communication was generated for {{employee_name}}.",
    defaultEmailSubject: "Welcome — {{employee_name}}",
    defaultEmailBody: "Welcome communication was generated for {{employee_name}} ({{employee_code}}).",
    sourceModule: "onboarding",
  }),
  def({
    type: "missed_punch",
    name: "Missed Punch",
    group: "attendance_leave",
    placeholders: ["employee_name"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "unavailable",
    unavailableReason: "Missed punch workflow is not implemented in Attendance.",
    defaultActive: false,
    defaultRecipients: [R("employee"), R("reporting_manager")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Missed punch",
    defaultMessage: "{{employee_name}} has a missed punch.",
    defaultEmailSubject: "Missed punch — {{employee_name}}",
    defaultEmailBody: "{{employee_name}} has a missed punch.",
    sourceModule: "attendance",
  }),
  def({
    type: "late_arrival",
    name: "Late Arrival",
    group: "attendance_leave",
    placeholders: ["employee_name"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "unavailable",
    unavailableReason: "Late arrival alerts are not an operational Attendance workflow.",
    defaultActive: false,
    defaultRecipients: [R("employee"), R("reporting_manager")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Late arrival",
    defaultMessage: "{{employee_name}} was marked late.",
    defaultEmailSubject: "Late arrival — {{employee_name}}",
    defaultEmailBody: "{{employee_name}} was marked late.",
    sourceModule: "attendance",
  }),
  def({
    type: "early_going",
    name: "Early Going",
    group: "attendance_leave",
    placeholders: ["employee_name"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "unavailable",
    unavailableReason: "Early going alerts are not an operational Attendance workflow.",
    defaultActive: false,
    defaultRecipients: [R("employee"), R("reporting_manager")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Early going",
    defaultMessage: "{{employee_name}} left early.",
    defaultEmailSubject: "Early going — {{employee_name}}",
    defaultEmailBody: "{{employee_name}} left early.",
    sourceModule: "attendance",
  }),
  def({
    type: "attendance_regularization_required",
    name: "Attendance Regularization Required",
    group: "attendance_leave",
    placeholders: ["employee_name"],
    supportsReminder: true,
    supportsRepeat: true,
    availability: "unavailable",
    unavailableReason: "Attendance regularization workflow is not implemented.",
    defaultActive: false,
    defaultRecipients: [R("employee"), R("reporting_manager")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Regularization required",
    defaultMessage: "Attendance regularization is required for {{employee_name}}.",
    defaultEmailSubject: "Regularization required — {{employee_name}}",
    defaultEmailBody: "Attendance regularization is required for {{employee_name}}.",
    sourceModule: "attendance",
    defaultReminderTiming: "every_day_until_completed",
  }),
  def({
    type: "attendance_regularization_approved",
    name: "Attendance Regularization Approved",
    group: "attendance_leave",
    placeholders: ["employee_name"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "unavailable",
    unavailableReason: "Attendance regularization workflow is not implemented.",
    defaultActive: false,
    defaultRecipients: [R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Regularization approved",
    defaultMessage: "Attendance regularization for {{employee_name}} was approved.",
    defaultEmailSubject: "Regularization approved",
    defaultEmailBody: "Attendance regularization for {{employee_name}} was approved.",
    sourceModule: "attendance",
  }),
  def({
    type: "attendance_regularization_rejected",
    name: "Attendance Regularization Rejected",
    group: "attendance_leave",
    placeholders: ["employee_name"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "unavailable",
    unavailableReason: "Attendance regularization workflow is not implemented.",
    defaultActive: false,
    defaultRecipients: [R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Regularization rejected",
    defaultMessage: "Attendance regularization for {{employee_name}} was rejected.",
    defaultEmailSubject: "Regularization rejected",
    defaultEmailBody: "Attendance regularization for {{employee_name}} was rejected.",
    sourceModule: "attendance",
  }),
  def({
    type: "leave_applied",
    name: "Leave Applied",
    group: "attendance_leave",
    placeholders: ["employee_name", "leave_type", "leave_from", "leave_to"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("reporting_manager"), R("hr")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Leave applied",
    defaultMessage: "{{employee_name}} applied for {{leave_type}} from {{leave_from}} to {{leave_to}}.",
    defaultEmailSubject: "Leave applied — {{employee_name}}",
    defaultEmailBody: "{{employee_name}} applied for {{leave_type}} from {{leave_from}} to {{leave_to}}.",
    sourceModule: "leave",
  }),
  def({
    type: "leave_approved",
    name: "Leave Approved",
    group: "attendance_leave",
    placeholders: ["employee_name", "leave_type", "leave_from", "leave_to"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Leave approved",
    defaultMessage: "Your {{leave_type}} from {{leave_from}} to {{leave_to}} has been approved.",
    defaultEmailSubject: "Leave approved",
    defaultEmailBody: "Your {{leave_type}} from {{leave_from}} to {{leave_to}} has been approved.",
    sourceModule: "leave",
  }),
  def({
    type: "leave_rejected",
    name: "Leave Rejected",
    group: "attendance_leave",
    placeholders: ["employee_name", "leave_type", "leave_from", "leave_to"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Leave rejected",
    defaultMessage: "Your {{leave_type}} from {{leave_from}} to {{leave_to}} was rejected.",
    defaultEmailSubject: "Leave rejected",
    defaultEmailBody: "Your {{leave_type}} from {{leave_from}} to {{leave_to}} was rejected.",
    sourceModule: "leave",
  }),
  def({
    type: "payroll_ready_for_review",
    name: "Payroll Ready for Review",
    group: "payroll",
    placeholders: ["payroll_month"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("hr"), R("finance")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Payroll ready for review",
    defaultMessage: "Payroll for {{payroll_month}} is calculated and ready for review.",
    defaultEmailSubject: "Payroll ready — {{payroll_month}}",
    defaultEmailBody: "Payroll for {{payroll_month}} is calculated and ready for review.",
    sourceModule: "payroll",
  }),
  def({
    type: "payroll_finalized",
    name: "Payroll Finalized",
    group: "payroll",
    placeholders: ["payroll_month"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("hr"), R("finance")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Payroll finalized",
    defaultMessage: "Payroll for {{payroll_month}} has been finalized.",
    defaultEmailSubject: "Payroll finalized — {{payroll_month}}",
    defaultEmailBody: "Payroll for {{payroll_month}} has been finalized.",
    sourceModule: "payroll",
  }),
  def({
    type: "payslip_generated",
    name: "Payslip Generated",
    group: "payroll",
    placeholders: ["employee_name", "payroll_month"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Payslip generated",
    defaultMessage: "Payslip for {{payroll_month}} has been generated for {{employee_name}}.",
    defaultEmailSubject: "Payslip generated — {{payroll_month}}",
    defaultEmailBody: "Payslip for {{payroll_month}} has been generated.",
    sourceModule: "payroll",
  }),
  def({
    type: "payslip_available",
    name: "Payslip Available",
    group: "payroll",
    placeholders: ["employee_name", "payroll_month"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Payslip available",
    defaultMessage: "Your payslip for {{payroll_month}} is now available.",
    defaultEmailSubject: "Payslip available — {{payroll_month}}",
    defaultEmailBody: "Your payslip for {{payroll_month}} is now available.",
    sourceModule: "payroll",
  }),
  def({
    type: "claim_submitted",
    name: "Claim Submitted",
    group: "reimbursements",
    placeholders: ["employee_name", "claim_no", "claim_amount"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("reporting_manager")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Claim submitted",
    defaultMessage: "{{employee_name}} submitted reimbursement claim {{claim_no}} for {{claim_amount}}.",
    defaultEmailSubject: "Claim submitted — {{claim_no}}",
    defaultEmailBody: "{{employee_name}} submitted reimbursement claim {{claim_no}} for {{claim_amount}}.",
    sourceModule: "reimbursements",
  }),
  def({
    type: "claim_returned",
    name: "Claim Returned",
    group: "reimbursements",
    placeholders: ["employee_name", "claim_no"],
    supportsReminder: true,
    supportsRepeat: true,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Action required — claim returned",
    defaultMessage: "Your reimbursement claim {{claim_no}} was returned. Action required.",
    defaultEmailSubject: "Claim returned — {{claim_no}}",
    defaultEmailBody: "Your reimbursement claim {{claim_no}} was returned. Action required.",
    sourceModule: "reimbursements",
    defaultReminderTiming: "every_day_until_completed",
  }),
  def({
    type: "claim_approved",
    name: "Claim Approved",
    group: "reimbursements",
    placeholders: ["employee_name", "claim_no", "approved_amount"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("employee"), R("finance")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Claim approved",
    defaultMessage: "Your reimbursement claim {{claim_no}} has been approved for {{approved_amount}}.",
    defaultEmailSubject: "Claim approved — {{claim_no}}",
    defaultEmailBody: "Your reimbursement claim {{claim_no}} has been approved for {{approved_amount}}.",
    sourceModule: "reimbursements",
  }),
  def({
    type: "claim_partially_approved",
    name: "Claim Partially Approved",
    group: "reimbursements",
    placeholders: ["employee_name", "claim_no", "approved_amount", "claim_amount"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("employee"), R("finance")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Claim partially approved",
    defaultMessage: "Claim {{claim_no}} was partially approved for {{approved_amount}} (claimed {{claim_amount}}).",
    defaultEmailSubject: "Claim partially approved — {{claim_no}}",
    defaultEmailBody: "Claim {{claim_no}} was partially approved for {{approved_amount}}.",
    sourceModule: "reimbursements",
  }),
  def({
    type: "claim_rejected",
    name: "Claim Rejected",
    group: "reimbursements",
    placeholders: ["employee_name", "claim_no"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Claim rejected",
    defaultMessage: "Your reimbursement claim {{claim_no}} was rejected.",
    defaultEmailSubject: "Claim rejected — {{claim_no}}",
    defaultEmailBody: "Your reimbursement claim {{claim_no}} was rejected.",
    sourceModule: "reimbursements",
  }),
  def({
    type: "exception_approval_required",
    name: "Exception Approval Required",
    group: "reimbursements",
    placeholders: ["employee_name", "claim_no", "claim_amount"],
    supportsReminder: true,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("hr")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Exception approval required",
    defaultMessage: "Claim {{claim_no}} from {{employee_name}} requires exception approval ({{claim_amount}}).",
    defaultEmailSubject: "Exception approval — {{claim_no}}",
    defaultEmailBody: "Claim {{claim_no}} from {{employee_name}} requires exception approval.",
    sourceModule: "reimbursements",
    defaultReminderTiming: "1_day_before",
  }),
  def({
    type: "claim_awaiting_finance_processing",
    name: "Claim Awaiting Finance Processing",
    group: "reimbursements",
    placeholders: ["employee_name", "claim_no", "approved_amount"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("finance")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Awaiting finance processing",
    defaultMessage: "Claim {{claim_no}} is approved and awaiting finance processing ({{approved_amount}}).",
    defaultEmailSubject: "Awaiting finance — {{claim_no}}",
    defaultEmailBody: "Claim {{claim_no}} is approved and awaiting finance processing.",
    sourceModule: "reimbursements",
  }),
  def({
    type: "claim_queued_for_payroll",
    name: "Claim Queued for Payroll",
    group: "reimbursements",
    placeholders: ["employee_name", "claim_no", "approved_amount"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("finance"), R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Queued for payroll",
    defaultMessage: "Claim {{claim_no}} was queued for payroll ({{approved_amount}}).",
    defaultEmailSubject: "Queued for payroll — {{claim_no}}",
    defaultEmailBody: "Claim {{claim_no}} was queued for payroll.",
    sourceModule: "reimbursements",
  }),
  def({
    type: "claim_ready_for_accounts",
    name: "Reimbursement Ready for Accounts",
    group: "reimbursements",
    placeholders: ["employee_name", "claim_no", "approved_amount"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("finance")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Ready for Accounts",
    defaultMessage: "Claim {{claim_no}} is ready for Accounts ({{approved_amount}}).",
    defaultEmailSubject: "Ready for Accounts — {{claim_no}}",
    defaultEmailBody: "Claim {{claim_no}} is ready for Accounts ingestion.",
    sourceModule: "reimbursements",
  }),
  def({
    type: "claim_sent_to_accounts",
    name: "Reimbursement Sent to Accounts",
    group: "reimbursements",
    placeholders: ["employee_name", "claim_no", "approved_amount"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("finance"), R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Sent to Accounts",
    defaultMessage: "Claim {{claim_no}} was marked sent to Accounts ({{approved_amount}}).",
    defaultEmailSubject: "Sent to Accounts — {{claim_no}}",
    defaultEmailBody: "Claim {{claim_no}} was marked sent to Accounts.",
    sourceModule: "reimbursements",
  }),
  def({
    type: "reimbursement_processed",
    name: "Reimbursement Processed",
    group: "reimbursements",
    placeholders: ["employee_name", "claim_no", "approved_amount"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Reimbursement processed",
    defaultMessage: "Reimbursement {{claim_no}} was processed for {{approved_amount}}.",
    defaultEmailSubject: "Reimbursement processed — {{claim_no}}",
    defaultEmailBody: "Reimbursement {{claim_no}} was processed for {{approved_amount}}.",
    sourceModule: "reimbursements",
  }),
  def({
    type: "travel_request_submitted",
    name: "Travel Request Submitted",
    group: "reimbursements",
    placeholders: ["employee_name", "request_no", "destination"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("reporting_manager")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Travel request submitted",
    defaultMessage: "{{employee_name}} submitted travel request {{request_no}} for {{destination}}.",
    defaultEmailSubject: "Travel request submitted — {{request_no}}",
    defaultEmailBody: "{{employee_name}} submitted travel request {{request_no}} for {{destination}}.",
    sourceModule: "reimbursements",
  }),
  def({
    type: "travel_request_pending_approval",
    name: "Travel Request Pending Approval",
    group: "reimbursements",
    placeholders: ["employee_name", "request_no", "destination"],
    supportsReminder: true,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("reporting_manager")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Travel request pending approval",
    defaultMessage: "Travel request {{request_no}} from {{employee_name}} ({{destination}}) is pending your approval.",
    defaultEmailSubject: "Pending travel request — {{request_no}}",
    defaultEmailBody: "Travel request {{request_no}} from {{employee_name}} is pending approval.",
    sourceModule: "reimbursements",
    defaultReminderTiming: "1_day_before",
  }),
  def({
    type: "travel_request_returned",
    name: "Travel Request Returned",
    group: "reimbursements",
    placeholders: ["employee_name", "request_no"],
    supportsReminder: true,
    supportsRepeat: true,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Travel request returned",
    defaultMessage: "Your travel request {{request_no}} was returned. Action required.",
    defaultEmailSubject: "Travel request returned — {{request_no}}",
    defaultEmailBody: "Your travel request {{request_no}} was returned.",
    sourceModule: "reimbursements",
    defaultReminderTiming: "every_day_until_completed",
  }),
  def({
    type: "travel_request_approved",
    name: "Travel Request Approved",
    group: "reimbursements",
    placeholders: ["employee_name", "request_no", "destination"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Travel request approved",
    defaultMessage: "Your travel request {{request_no}} for {{destination}} has been approved.",
    defaultEmailSubject: "Travel request approved — {{request_no}}",
    defaultEmailBody: "Your travel request {{request_no}} has been approved.",
    sourceModule: "reimbursements",
  }),
  def({
    type: "travel_request_rejected",
    name: "Travel Request Rejected",
    group: "reimbursements",
    placeholders: ["employee_name", "request_no"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("employee")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Travel request rejected",
    defaultMessage: "Your travel request {{request_no}} was rejected.",
    defaultEmailSubject: "Travel request rejected — {{request_no}}",
    defaultEmailBody: "Your travel request {{request_no}} was rejected.",
    sourceModule: "reimbursements",
  }),
  def({
    type: "hr_letter_generated",
    name: "HR Letter Generated",
    group: "letters",
    placeholders: ["employee_name", "letter_type"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("hr")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "HR letter generated",
    defaultMessage: "{{letter_type}} was generated for {{employee_name}}.",
    defaultEmailSubject: "{{letter_type}} generated",
    defaultEmailBody: "{{letter_type}} was generated for {{employee_name}}.",
    sourceModule: "hr_letters",
  }),
  def({
    type: "hr_letter_issued",
    name: "HR Letter Issued",
    group: "letters",
    placeholders: ["employee_name", "letter_type"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("employee"), R("hr")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "HR letter issued",
    defaultMessage: "{{letter_type}} was issued to {{employee_name}}.",
    defaultEmailSubject: "{{letter_type}} issued",
    defaultEmailBody: "{{letter_type}} was issued to {{employee_name}}.",
    sourceModule: "hr_letters",
  }),
  def({
    type: "offboarding_initiated",
    name: "Offboarding Initiated",
    group: "offboarding",
    placeholders: ["employee_name", "last_working_date"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("hr"), R("admin")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Offboarding initiated",
    defaultMessage: "Offboarding started for {{employee_name}}. Last working date {{last_working_date}}.",
    defaultEmailSubject: "Offboarding initiated — {{employee_name}}",
    defaultEmailBody: "Offboarding started for {{employee_name}}. Last working date {{last_working_date}}.",
    sourceModule: "offboarding",
  }),
  def({
    type: "resignation_submitted",
    name: "Resignation Submitted",
    group: "offboarding",
    placeholders: ["employee_name", "last_working_date"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("hr"), R("admin")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Resignation submitted",
    defaultMessage:
      "{{employee_name}} submitted a resignation. Proposed LWD {{last_working_date}}.",
    defaultEmailSubject: "Resignation submitted — {{employee_name}}",
    defaultEmailBody:
      "{{employee_name}} submitted a resignation. Proposed last working date {{last_working_date}}.",
    sourceModule: "offboarding",
  }),
  def({
    type: "resignation_accepted",
    name: "Resignation Accepted",
    group: "offboarding",
    placeholders: ["employee_name", "last_working_date"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("employee"), R("hr")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Resignation accepted",
    defaultMessage:
      "Resignation for {{employee_name}} was accepted. Final LWD {{last_working_date}}.",
    defaultEmailSubject: "Resignation accepted — {{employee_name}}",
    defaultEmailBody:
      "Resignation for {{employee_name}} was accepted. Final last working date {{last_working_date}}.",
    sourceModule: "offboarding",
  }),
  def({
    type: "resignation_rejected",
    name: "Resignation Rejected",
    group: "offboarding",
    placeholders: ["employee_name", "last_working_date"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("employee"), R("hr")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Resignation rejected",
    defaultMessage: "Resignation request for {{employee_name}} was rejected.",
    defaultEmailSubject: "Resignation rejected — {{employee_name}}",
    defaultEmailBody: "Resignation request for {{employee_name}} was rejected.",
    sourceModule: "offboarding",
  }),
  def({
    type: "handover_pending",
    name: "Handover Pending",
    group: "offboarding",
    placeholders: ["employee_name", "last_working_date"],
    supportsReminder: true,
    supportsRepeat: true,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("hr"), R("reporting_manager")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Handover pending",
    defaultMessage: "Handover is pending for {{employee_name}} (LWD {{last_working_date}}).",
    defaultEmailSubject: "Handover pending — {{employee_name}}",
    defaultEmailBody: "Handover is pending for {{employee_name}}.",
    sourceModule: "offboarding",
    defaultReminderTiming: "every_day_until_completed",
  }),
  def({
    type: "asset_return_pending",
    name: "Asset Return Pending",
    group: "offboarding",
    placeholders: ["employee_name", "last_working_date"],
    supportsReminder: true,
    supportsRepeat: true,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("hr"), R("admin")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Asset return pending",
    defaultMessage: "Asset return is pending for {{employee_name}}.",
    defaultEmailSubject: "Asset return pending — {{employee_name}}",
    defaultEmailBody: "Asset return is pending for {{employee_name}}.",
    sourceModule: "offboarding",
    defaultReminderTiming: "every_day_until_completed",
  }),
  def({
    type: "clearance_pending",
    name: "Clearance Pending",
    group: "offboarding",
    placeholders: ["employee_name", "last_working_date"],
    supportsReminder: true,
    supportsRepeat: true,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("hr"), R("finance")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Clearance pending",
    defaultMessage: "Clearance is pending for {{employee_name}} (LWD {{last_working_date}}).",
    defaultEmailSubject: "Clearance pending — {{employee_name}}",
    defaultEmailBody: "Clearance is pending for {{employee_name}}.",
    sourceModule: "offboarding",
    defaultReminderTiming: "every_day_until_completed",
  }),
  def({
    type: "last_working_date_approaching",
    name: "Last Working Date Approaching",
    group: "offboarding",
    placeholders: ["employee_name", "last_working_date"],
    supportsReminder: true,
    supportsRepeat: false,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("hr"), R("reporting_manager")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Last working date approaching",
    defaultMessage: "Last working date for {{employee_name}} is {{last_working_date}}.",
    defaultEmailSubject: "LWD approaching — {{employee_name}}",
    defaultEmailBody: "Last working date for {{employee_name}} is {{last_working_date}}.",
    sourceModule: "offboarding",
    defaultReminderTiming: "3_days_before",
  }),
  def({
    type: "offboarding_ready_for_completion",
    name: "Offboarding Ready for Completion",
    group: "offboarding",
    placeholders: ["employee_name", "last_working_date"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: false,
    defaultRecipients: [R("hr")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Ready for completion",
    defaultMessage: "Offboarding for {{employee_name}} is ready for completion.",
    defaultEmailSubject: "Offboarding ready — {{employee_name}}",
    defaultEmailBody: "Offboarding for {{employee_name}} is ready for completion.",
    sourceModule: "offboarding",
  }),
  def({
    type: "offboarding_completed",
    name: "Offboarding Completed",
    group: "offboarding",
    placeholders: ["employee_name", "last_working_date"],
    supportsReminder: false,
    supportsRepeat: false,
    availability: "available",
    defaultActive: true,
    defaultRecipients: [R("hr"), R("admin")],
    defaultInApp: true,
    defaultEmail: false,
    defaultTitle: "Offboarding completed",
    defaultMessage: "Offboarding for {{employee_name}} is complete (LWD {{last_working_date}}).",
    defaultEmailSubject: "Offboarding completed — {{employee_name}}",
    defaultEmailBody: "Offboarding for {{employee_name}} is complete.",
    sourceModule: "offboarding",
  }),
];

const PLACEHOLDER_LABELS: Record<string, string> = {
  employee_name: "Employee name",
  employee_code: "Employee code",
  joining_date: "Joining date",
  document_name: "Document name",
  leave_type: "Leave type",
  leave_from: "Leave from",
  leave_to: "Leave to",
  payroll_month: "Payroll month",
  claim_no: "Claim no",
  claim_amount: "Claim amount",
  approved_amount: "Approved amount",
  request_no: "Request no",
  destination: "Destination",
  letter_type: "Letter type",
  last_working_date: "Last working date",
};

const SAMPLE_VALUES: Record<string, string> = {
  employee_name: "Aarav Deshmukh",
  employee_code: "EMP-0002",
  joining_date: "01 Apr 2026",
  document_name: "PAN Card",
  leave_type: "Casual Leave",
  leave_from: "12 Apr 2026",
  leave_to: "14 Apr 2026",
  payroll_month: "April 2026",
  claim_no: "CLM-1042",
  claim_amount: "₹4,800",
  approved_amount: "₹4,200",
  request_no: "TRV-2026-0001",
  destination: "Mumbai",
  letter_type: "Experience Letter",
  last_working_date: "30 Apr 2026",
};

function defaultReminderTiming(def: EventDefinition): ReminderTiming {
  const t = def.defaultReminderTiming;
  if (t && REMINDER_TIMING_OPTIONS.some((o) => o.value === t)) return t;
  return def.supportsRepeat ? "every_day_until_completed" : "1_day_before";
}

export function getEventDefinition(eventType: string): EventDefinition | undefined {
  return EVENT_CATALOG.find((e) => e.type === eventType);
}

export function seedEventConfig(def: EventDefinition): HrNotificationEventConfig {
  return {
    eventType: def.type,
    active: def.availability === "available" && def.defaultActive,
    recipients: def.defaultRecipients.map((r) => ({ ...r })),
    inAppEnabled: def.defaultInApp,
    inAppTitle: def.defaultTitle,
    inAppMessage: def.defaultMessage,
    emailEnabled: def.defaultEmail,
    emailSubject: def.defaultEmailSubject,
    emailBody: def.defaultEmailBody,
    reminderEnabled: false,
    reminderTiming: defaultReminderTiming(def),
    reminderRepeat: def.supportsRepeat ? "daily" : "",
  };
}

function emit(name: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(name));
}

export function loadNotificationSettings(): HrNotificationEventConfig[] {
  const seeded = EVENT_CATALOG.map(seedEventConfig);
  if (typeof window === "undefined") return seeded;
  try {
    const raw = localStorage.getItem(HR_NOTIFICATION_SETTINGS_KEY);
    if (!raw) {
      localStorage.setItem(HR_NOTIFICATION_SETTINGS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const saved = JSON.parse(raw) as HrNotificationEventConfig[];
    const byType = new Map(saved.map((c) => [c.eventType, c]));
    return EVENT_CATALOG.map((def) => {
      const prev = byType.get(def.type);
      const base = seedEventConfig(def);
      if (!prev) return base;
      return {
        ...base,
        ...prev,
        eventType: def.type,
        recipients: Array.isArray(prev.recipients) && prev.recipients.length ? prev.recipients : base.recipients,
        reminderRepeat: prev.reminderRepeat ?? base.reminderRepeat,
      };
    });
  } catch {
    return seeded;
  }
}

export function saveNotificationSettings(list: HrNotificationEventConfig[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HR_NOTIFICATION_SETTINGS_KEY, JSON.stringify(list));
  emit(HR_NOTIFICATION_SETTINGS_EVENT);
}

export function getNotificationConfig(eventType: string): HrNotificationEventConfig | undefined {
  return loadNotificationSettings().find((c) => c.eventType === eventType);
}

export function upsertNotificationConfig(next: HrNotificationEventConfig): void {
  const list = loadNotificationSettings().map((c) => (c.eventType === next.eventType ? next : c));
  saveNotificationSettings(list);
}

export function loadHrNotifications(): HrInAppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HR_NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HrInAppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHrNotifications(list: HrInAppNotification[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HR_NOTIFICATIONS_KEY, JSON.stringify(list));
  emit(HR_NOTIFICATIONS_EVENT);
}

export function loadInboxView(): InboxView {
  if (typeof window === "undefined") return { mode: "session" };
  try {
    const raw = localStorage.getItem(HR_NOTIFICATION_INBOX_KEY);
    if (!raw) return { mode: "session" };
    const parsed = JSON.parse(raw) as InboxView;
    if (parsed?.mode === "employee" && parsed.employeeId) return parsed;
    if (parsed?.mode === "role" && parsed.key) return parsed;
    return { mode: "session" };
  } catch {
    return { mode: "session" };
  }
}

export function saveInboxView(view: InboxView): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HR_NOTIFICATION_INBOX_KEY, JSON.stringify(view));
  emit(HR_NOTIFICATIONS_EVENT);
}

function norm(s: string): string {
  return (s || "").trim().toLowerCase();
}

function matchUser(username: string): UserRecord | undefined {
  const key = norm(username);
  if (!key) return undefined;
  return loadUsers().find(
    (u) =>
      norm(u.fullName) === key ||
      norm(u.email) === key ||
      norm(u.employeeId) === key ||
      u.fullName.split(" ")[0]?.toLowerCase() === key,
  );
}

function matchEmployee(username: string): HrEmployee | undefined {
  const key = norm(username);
  if (!key) return undefined;
  return loadHrEmployees().find(
    (e) =>
      norm(e.employeeName) === key ||
      norm(e.employeeCode) === key ||
      norm(e.emailId) === key ||
      e.employeeName.split(" ")[0]?.toLowerCase() === key,
  );
}

export function getSessionUsername(): string {
  if (typeof window === "undefined") return CURRENT_USER;
  try {
    const raw = localStorage.getItem("user") || localStorage.getItem("ds_auth_user");
    if (raw) {
      const parsed = JSON.parse(raw) as { username?: string; name?: string };
      if (parsed?.username) return parsed.username;
      if (parsed?.name) return parsed.name;
    }
  } catch {
    /* ignore */
  }
  return CURRENT_USER;
}

export function sessionInboxKeys(username = getSessionUsername()): string[] {
  const keys = new Set<string>();
  const isAdmin = norm(username) === "admin" || username === CURRENT_USER;
  if (isAdmin) {
    keys.add("role:admin");
    keys.add("role:hr");
    keys.add("role:finance");
  }
  const user = matchUser(username);
  if (user) {
    keys.add(`user:${user.id}`);
    const role = loadRoles().find((r) => norm(r.roleName) === norm(user.role));
    if (role) keys.add(`role:${role.id}`);
    if (norm(user.department) === "hr" || norm(user.role).includes("hr")) keys.add("role:hr");
    if (norm(user.department) === "accounts" || norm(user.department) === "finance") {
      keys.add("role:finance");
    }
    if (norm(user.role) === "admin") keys.add("role:admin");
  }
  const emp = matchEmployee(username);
  if (emp) keys.add(`employee:${emp.id}`);
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/employee")) {
    try {
      const raw = localStorage.getItem(CLAIM_ACTOR_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { employeeId?: number };
        if (parsed.employeeId) keys.add(`employee:${parsed.employeeId}`);
      }
    } catch {
      /* ignore */
    }
  }
  return [...keys];
}

export function activeInboxKeys(): string[] {
  const view = loadInboxView();
  if (view.mode === "employee") return [`employee:${view.employeeId}`];
  if (view.mode === "role") return [view.key];
  return sessionInboxKeys();
}

export function inboxLabel(): string {
  const view = loadInboxView();
  if (view.mode === "employee") {
    const emp = getHrEmployeeById(view.employeeId);
    return emp ? `${emp.employeeName} (${emp.employeeCode})` : `Employee #${view.employeeId}`;
  }
  if (view.mode === "role") {
    if (view.key === "role:admin") return "Admin";
    if (view.key === "role:hr") return "HR";
    if (view.key === "role:finance") return "Finance";
    return view.key;
  }
  return `Current user (${getSessionUsername()})`;
}

export function notificationsForInbox(keys = activeInboxKeys()): HrInAppNotification[] {
  const set = new Set(keys);
  return loadHrNotifications()
    .filter((n) => set.has(n.recipientKey))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadCountForInbox(keys = activeInboxKeys()): number {
  return notificationsForInbox(keys).filter((n) => !n.readAt).length;
}

export function markNotificationRead(id: string): void {
  const list = loadHrNotifications().map((n) =>
    n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n,
  );
  saveHrNotifications(list);
}

export function markInboxAllRead(keys = activeInboxKeys()): void {
  const set = new Set(keys);
  const now = new Date().toISOString();
  saveHrNotifications(
    loadHrNotifications().map((n) => (set.has(n.recipientKey) && !n.readAt ? { ...n, readAt: now } : n)),
  );
}

export function clearReadInboxNotifications(keys = activeInboxKeys()): void {
  const set = new Set(keys);
  saveHrNotifications(loadHrNotifications().filter((n) => !(set.has(n.recipientKey) && n.readAt)));
}

export function recipientKindLabel(kind: RecipientKind): string {
  return RECIPIENT_KIND_OPTIONS.find((o) => o.kind === kind)?.label ?? kind;
}

export function formatRecipients(recipients: NotificationRecipient[]): string {
  if (!recipients.length) return "—";
  return recipients
    .map((r) => {
      if (r.kind === "specific_role") return r.roleName || "Role";
      if (r.kind === "specific_user") return r.userName || "User";
      return recipientKindLabel(r.kind);
    })
    .join(", ");
}

export function reminderTimingLabel(t: ReminderTiming): string {
  return REMINDER_TIMING_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

export function reminderRepeatLabel(r: ReminderRepeat | ""): string {
  if (!r) return "";
  return REMINDER_REPEAT_OPTIONS.find((o) => o.value === r)?.label ?? r;
}

export function placeholderLabel(key: string): string {
  return PLACEHOLDER_LABELS[key] ?? key;
}

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function findPlaceholders(text: string): string[] {
  const out: string[] = [];
  const re = new RegExp(TOKEN_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[1] && !out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

export function unknownPlaceholders(text: string, allowed: string[]): string[] {
  return findPlaceholders(text).filter((k) => !allowed.includes(k));
}

export function renderTemplate(
  template: string,
  context: Record<string, string | number | null | undefined>,
  allowed: string[],
): { text: string; unknown: string[] } {
  const unknown = unknownPlaceholders(template, allowed);
  const text = template.replace(TOKEN_RE, (_, key: string) => {
    // Unknown tokens stay visible as {{token}} — never invent or emit undefined/null.
    if (!allowed.includes(key)) return `{{${key}}}`;
    const raw = context[key];
    if (raw == null) return "";
    const s = String(raw).trim();
    if (s === "" || s === "undefined" || s === "null") return "";
    return s;
  });
  return { text, unknown };
}

export function sampleContextForEvent(eventType: HrNotificationEventType): Record<string, string> {
  const def = getEventDefinition(eventType);
  const ctx: Record<string, string> = {};
  (def?.placeholders ?? Object.keys(SAMPLE_VALUES)).forEach((k) => {
    ctx[k] = SAMPLE_VALUES[k] ?? "";
  });
  return ctx;
}

export function sourceHrefFor(eventType: HrNotificationEventType, sourceId: string): string {
  if (!sourceId) {
    const def = getEventDefinition(eventType);
    if (def?.sourceModule === "leave") return "/hr/requests";
    if (def?.sourceModule === "reimbursements") return "/hr/reimbursements";
    if (def?.sourceModule === "payroll") return "/hr/payroll";
    if (def?.sourceModule === "hr_letters") return "/hr/hr-letters";
    if (def?.sourceModule === "offboarding") return "/hr/offboarding";
    if (def?.sourceModule === "employees" || def?.sourceModule === "onboarding") return "/hr/employees";
    return "";
  }
  switch (eventType) {
    case "leave_applied":
    case "leave_approved":
    case "leave_rejected":
      return "/hr/requests";
    case "claim_submitted":
    case "claim_returned":
    case "claim_approved":
    case "claim_partially_approved":
    case "claim_rejected":
    case "exception_approval_required":
    case "claim_awaiting_finance_processing":
      return `/hr/reimbursements?claim=${encodeURIComponent(sourceId)}`;
    case "claim_queued_for_payroll":
    case "claim_ready_for_accounts":
    case "claim_sent_to_accounts":
    case "reimbursement_processed":
      return `/hr/reimbursements?tab=processing&claim=${encodeURIComponent(sourceId)}`;
    case "travel_request_submitted":
    case "travel_request_pending_approval":
    case "travel_request_returned":
    case "travel_request_approved":
    case "travel_request_rejected":
      return `/hr/travel-requests?id=${encodeURIComponent(sourceId)}`;
    case "payslip_generated":
    case "payslip_available":
    case "payroll_ready_for_review":
    case "payroll_finalized":
      return "/hr/payroll";
    case "hr_letter_generated":
    case "hr_letter_issued":
      return "/hr/hr-letters";
    case "resignation_submitted":
    case "resignation_rejected":
      return "/hr/offboarding";
    case "offboarding_initiated":
    case "resignation_accepted":
    case "handover_pending":
    case "asset_return_pending":
    case "clearance_pending":
    case "last_working_date_approaching":
    case "offboarding_ready_for_completion":
    case "offboarding_completed":
      return `/hr/offboarding/${encodeURIComponent(sourceId)}`;
    case "employee_created":
    case "onboarding_started":
    case "welcome_communication":
    case "document_pending":
    case "mandatory_document_missing":
    case "joining_checklist_pending":
      return `/hr/employees/${encodeURIComponent(sourceId)}`;
    default:
      return "";
  }
}

export function sourceModuleLabel(module: string): string {
  const map: Record<string, string> = {
    employees: "Employees",
    onboarding: "Onboarding",
    attendance: "Attendance",
    leave: "Leave",
    payroll: "Payroll",
    reimbursements: "Reimbursements",
    hr_letters: "HR Letters",
    offboarding: "Offboarding",
  };
  return map[module] ?? module;
}

interface ResolvedRecipient {
  key: string;
  label: string;
}

function resolveRecipients(config: HrNotificationEventConfig, employeeId?: number): ResolvedRecipient[] {
  const emp = employeeId != null ? getHrEmployeeById(employeeId) : undefined;
  const out: ResolvedRecipient[] = [];
  const push = (key: string, label: string) => {
    if (!out.some((r) => r.key === key)) out.push({ key, label });
  };

  for (const r of config.recipients) {
    switch (r.kind) {
      case "employee":
        if (emp) push(`employee:${emp.id}`, emp.employeeName);
        break;
      case "reporting_manager": {
        if (emp?.reportingManagerId) {
          const mgr = getHrEmployeeById(emp.reportingManagerId);
          if (mgr) push(`employee:${mgr.id}`, mgr.employeeName);
          else push(`employee:${emp.reportingManagerId}`, emp.reportingManagerName || "Reporting Manager");
        } else if (emp?.reportingManagerName && emp.reportingManagerName !== "—") {
          push(`manager:${norm(emp.reportingManagerName)}`, emp.reportingManagerName);
        }
        break;
      }
      case "hr":
        push("role:hr", "HR");
        break;
      case "finance":
        push("role:finance", "Finance");
        break;
      case "admin":
        push("role:admin", "Admin");
        break;
      case "specific_role":
        if (r.roleId != null) push(`role:${r.roleId}`, r.roleName || `Role ${r.roleId}`);
        break;
      case "specific_user":
        if (r.userId != null) push(`user:${r.userId}`, r.userName || `User ${r.userId}`);
        break;
      default:
        break;
    }
  }
  return out;
}

export interface CreateHrNotificationInput {
  eventType: HrNotificationEventType;
  context?: Record<string, string | number | null | undefined>;
  sourceModule?: string;
  sourceId?: string;
  employeeId?: number;
  recipient?: NotificationRecipient;
}

export function createHrNotification(input: CreateHrNotificationInput): HrInAppNotification[] {
  const def = getEventDefinition(input.eventType);
  if (!def || def.availability !== "available") return [];
  const config = getNotificationConfig(input.eventType);
  if (!config || !config.active) return [];

  const recipients = input.recipient
    ? resolveRecipients({ ...config, recipients: [input.recipient] }, input.employeeId)
    : resolveRecipients(config, input.employeeId);
  if (!recipients.length) return [];

  const ctx = input.context ?? {};
  const titleRendered = renderTemplate(config.inAppTitle || def.defaultTitle, ctx, def.placeholders);
  const msgRendered = renderTemplate(config.inAppMessage || def.defaultMessage, ctx, def.placeholders);
  const title = titleRendered.text.trim() || def.name;
  const message = msgRendered.text.trim();
  const sourceModule = input.sourceModule || def.sourceModule;
  const sourceId = input.sourceId ? String(input.sourceId) : "";
  const sourceHref = sourceHrefFor(def.type, sourceId);
  const now = new Date().toISOString();
  const emailStatus: EmailChannelStatus = config.emailEnabled ? "pending_integration" : "off";

  if (!config.inAppEnabled) return [];

  const existing = loadHrNotifications();
  const created: HrInAppNotification[] = [];
  for (const rec of recipients) {
    const dup = existing.some(
      (n) =>
        n.eventType === def.type &&
        n.recipientKey === rec.key &&
        n.sourceId === sourceId &&
        Math.abs(new Date(n.createdAt).getTime() - Date.now()) < 2500,
    );
    if (dup) continue;
    created.push({
      id: `hn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      recipientKey: rec.key,
      recipientLabel: rec.label,
      eventType: def.type,
      title,
      message,
      sourceModule,
      sourceId,
      sourceHref,
      createdAt: now,
      readAt: null,
      channelStatus: { inApp: "delivered", email: emailStatus },
    });
  }
  if (!created.length) return [];
  saveHrNotifications([...created, ...existing].slice(0, 500));
  return created;
}

export function formatNotificationTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day} days ago`;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function insertPlaceholderToken(current: string, key: string, cursor?: number): string {
  const token = `{{${key}}}`;
  if (cursor == null || cursor < 0 || cursor > current.length) return `${current}${token}`;
  return current.slice(0, cursor) + token + current.slice(cursor);
}
