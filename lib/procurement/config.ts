/** Procurement module configuration (client-side; replace with API later). */

export const CURRENT_USER = "Admin";

export const PROCUREMENT_APPROVER = "Admin";

export const PROCUREMENT_APPROVAL = {
  prEnabled: true,
  poEnabled: true,
};

export const BRANCH_OPTIONS = [
  { value: "hq-pune", label: "HQ — Pune" },
  { value: "branch-mumbai", label: "Branch — Mumbai" },
  { value: "branch-nagpur", label: "Branch — Nagpur" },
  { value: "warehouse-aurangabad", label: "Warehouse — Aurangabad" },
];

export const DEPARTMENT_OPTIONS = [
  { value: "procurement", label: "Procurement" },
  { value: "sales", label: "Sales" },
  { value: "accounts", label: "Accounts" },
  { value: "field-force", label: "Field Force" },
  { value: "hr", label: "HR" },
];

export const CURRENCY_OPTIONS = [
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "USD", label: "USD — US Dollar" },
];

export const PAYMENT_TERMS_OPTIONS = [
  { value: "advance", label: "Advance (Full)" },
  { value: "net-7", label: "Net 7 Days" },
  { value: "net-15", label: "Net 15 Days" },
  { value: "net-30", label: "Net 30 Days" },
  { value: "net-45", label: "Net 45 Days" },
  { value: "net-60", label: "Net 60 Days" },
];

export const DELIVERY_TERMS_OPTIONS = [
  { value: "ex-works", label: "Ex Works" },
  { value: "fob", label: "FOB" },
  { value: "cif", label: "CIF" },
  { value: "door-delivery", label: "Door Delivery" },
];

export const COMPANY_BILLING = {
  companyName: "Dharitri Sutra Agri Solutions Pvt Ltd",
  billingAddress: "Plot 12, Agri Park, Hinjawadi Phase 2, Pune, Maharashtra 411057",
  gstNumber: "27AABCD1234E1Z5",
  state: "Maharashtra",
  city: "Pune",
  pincode: "411057",
};
