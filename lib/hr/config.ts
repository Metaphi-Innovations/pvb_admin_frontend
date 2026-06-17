/** HR module configuration (client-side; replace with API later). */

export const CURRENT_USER = "Admin";

export const HR_APPROVAL = {
  tadaClaimEnabled: true,
};

export const BRANCH_OPTIONS = [
  { value: "hq-pune", label: "HQ — Pune" },
  { value: "branch-mumbai", label: "Branch — Mumbai" },
  { value: "branch-nagpur", label: "Branch — Nagpur" },
  { value: "warehouse-aurangabad", label: "Warehouse — Aurangabad" },
];

export const DEPARTMENT_OPTIONS = [
  { value: "Accounts", label: "Accounts" },
  { value: "HR", label: "HR" },
  { value: "Procurement", label: "Procurement" },
  { value: "Warehouse", label: "Warehouse" },
  { value: "Admin", label: "Admin" },
];

/** @deprecated Reference only — roles are managed in User Management Role Master */
export const SF_ROLE_CODES = ["RSM", "ZSM", "ASM", "TM", "FMO", "KAM", "DO", "Intern"] as const;

export const SF_ROLE_OPTIONS = [
  "Regional Sales Manager",
  "Zonal Sales Manager",
  "Area Sales Manager",
  "Territory Manager",
  "Field Marketing Officer",
  "Key Account Manager",
  "District Officer",
  "Intern",
] as const;

export const CITY_CATEGORY_POLICY_OPTIONS = ["Mega Metro", "Metro", "Other"] as const;

/** @deprecated Use CITY_CATEGORY_POLICY_OPTIONS */
export const CITY_CATEGORY_OPTIONS = CITY_CATEGORY_POLICY_OPTIONS;

export const CLAIM_TYPE_OPTIONS = [
  { code: "local_travel", label: "Local Travel", billsRequired: false },
  { code: "outstation_travel", label: "Outstation Travel", billsRequired: true },
  { code: "km_reimbursement", label: "KM Reimbursement", billsRequired: false },
  { code: "incidental", label: "Incidental", billsRequired: false },
] as const;

export const TRAVEL_TYPE_OPTIONS = ["Local", "Outstation"] as const;
export const VEHICLE_TYPE_OPTIONS = ["Two Wheeler", "Four Wheeler"] as const;

export const TRAVEL_MODE_OPTIONS = [
  "Air",
  "Rail",
  "Bus",
  "Own Vehicle",
  "Local Conveyance",
] as const;

export const EXPENSE_TYPE_OPTIONS = [
  "Lodging",
  "Boarding",
  "Meals",
  "Local Conveyance",
  "Incidental Allowance",
  "KM Reimbursement",
] as const;

export const ATTENDANCE_STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "half_day", label: "Half Day" },
  { value: "leave", label: "Leave" },
  { value: "holiday", label: "Holiday" },
  { value: "week_off", label: "Week Off" },
  { value: "wfh", label: "WFH" },
] as const;

export const ATTENDANCE_SOURCE_OPTIONS = [
  { value: "biometric", label: "Biometric" },
  { value: "mobile_app", label: "Mobile App" },
  { value: "web", label: "Web" },
  { value: "manual", label: "Manual" },
] as const;

export const CORRECTION_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

export const PAYMENT_STATUS_OPTIONS = [
  { value: "pending_payment", label: "Pending Payment" },
  { value: "sent_to_accounts", label: "Sent to Accounts" },
  { value: "paid", label: "Paid" },
] as const;

export const DESIGNATION_OPTIONS = [...SF_ROLE_OPTIONS];

export const EMPLOYEE_TYPE_OPTIONS = [
  { value: "permanent", label: "Permanent" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
] as const;

export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "probation", label: "Probation" },
  { value: "notice", label: "Notice Period" },
  { value: "resigned", label: "Resigned" },
] as const;

export const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];
