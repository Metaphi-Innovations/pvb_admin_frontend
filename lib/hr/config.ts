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
  { value: "Sales", label: "Sales" },
  { value: "HR", label: "HR" },
  { value: "Accounts", label: "Accounts" },
  { value: "Procurement", label: "Procurement" },
  { value: "Field Force", label: "Field Force" },
  { value: "Operations", label: "Operations" },
];

/** Sales Force Travel Policy — role / grade entitlements */
export const SF_ROLE_OPTIONS = [
  "National Sales Manager",
  "Regional Sales Manager / State Head",
  "Area Sales Manager",
  "Territory Manager",
  "Agronomist",
] as const;

export const TRAVEL_CLASS_OPTIONS = ["Economy", "Business", "AC 2-Tier", "AC 3-Tier", "Sleeper"] as const;

export const LOCAL_CONVEYANCE_MODE_OPTIONS = [
  "Auto / Taxi",
  "Company Cab",
  "Public Transport",
  "Own Vehicle",
] as const;

export const CITY_CATEGORY_POLICY_OPTIONS = ["Mega Metro", "Metro", "Others"] as const;

/** @deprecated Use CITY_CATEGORY_POLICY_OPTIONS — kept for legacy tada-policy route */
export const CITY_CATEGORY_OPTIONS = CITY_CATEGORY_POLICY_OPTIONS;

export const VEHICLE_TYPE_POLICY_OPTIONS = ["Two-Wheeler", "Four-Wheeler"] as const;

/** @deprecated Use VEHICLE_TYPE_POLICY_OPTIONS — kept for legacy tada-policy route */
export const VEHICLE_TYPE_OPTIONS = VEHICLE_TYPE_POLICY_OPTIONS;

export const CLAIM_TYPE_OPTIONS = [
  { code: "travel", label: "Travel", billsRequired: true },
  { code: "lodging", label: "Lodging", billsRequired: true },
  { code: "boarding", label: "Boarding", billsRequired: true },
  { code: "local_conveyance", label: "Local Conveyance", billsRequired: false },
  { code: "km_reimbursement", label: "KM Reimbursement", billsRequired: false },
  { code: "incidental", label: "Incidental", billsRequired: false },
  { code: "other", label: "Other", billsRequired: true },
] as const;

export const TRAVEL_MODE_OPTIONS = [
  "Air",
  "Train",
  "Bus",
  "Taxi / Auto",
  "Own Two-Wheeler",
  "Own Four-Wheeler",
  "Company Vehicle",
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
