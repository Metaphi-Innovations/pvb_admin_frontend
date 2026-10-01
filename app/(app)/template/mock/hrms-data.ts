/** Template-only HRMS mock data. Not connected to production APIs. */

export type EmployeeStatus = "active" | "probation" | "notice" | "exited" | "on-leave";

export interface MockEmployee {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  branch: string;
  manager: string;
  status: EmployeeStatus;
  doj: string;
  profilePct: number;
  avatar?: string;
}

export const MOCK_EMPLOYEES: MockEmployee[] = [
  {
    id: "1",
    code: "EMP-1042",
    name: "Priya Sharma",
    email: "priya.sharma@dharitri.in",
    phone: "+91 98765 43210",
    department: "Human Resources",
    designation: "HR Business Partner",
    branch: "Pune HO",
    manager: "Ananya Deshmukh",
    status: "active",
    doj: "2022-04-12",
    profilePct: 92,
  },
  {
    id: "2",
    code: "EMP-1188",
    name: "Rahul Mehta",
    email: "rahul.mehta@dharitri.in",
    phone: "+91 98111 22334",
    department: "Sales",
    designation: "Territory Manager",
    branch: "Nagpur",
    manager: "Vikram Patil",
    status: "active",
    doj: "2021-08-01",
    profilePct: 78,
  },
  {
    id: "3",
    code: "EMP-1205",
    name: "Sneha Kulkarni",
    email: "sneha.k@dharitri.in",
    phone: "+91 99220 44556",
    department: "Finance",
    designation: "Accounts Executive",
    branch: "Pune HO",
    manager: "Meera Joshi",
    status: "probation",
    doj: "2025-11-15",
    profilePct: 64,
  },
  {
    id: "4",
    code: "EMP-0981",
    name: "Amit Verma",
    email: "amit.verma@dharitri.in",
    phone: "+91 90000 11223",
    department: "Warehouse",
    designation: "Store In-Charge",
    branch: "Aurangabad DC",
    manager: "Suresh Nair",
    status: "on-leave",
    doj: "2019-03-20",
    profilePct: 88,
  },
  {
    id: "5",
    code: "EMP-1310",
    name: "Neha Gupta",
    email: "neha.gupta@dharitri.in",
    phone: "+91 97654 32109",
    department: "IT",
    designation: "Software Engineer",
    branch: "Pune HO",
    manager: "Karthik Iyer",
    status: "notice",
    doj: "2023-01-09",
    profilePct: 95,
  },
  {
    id: "6",
    code: "EMP-0755",
    name: "Deepak Singh",
    email: "deepak.singh@dharitri.in",
    phone: "+91 98887 66554",
    department: "Field Force",
    designation: "Area Sales Officer",
    branch: "Indore",
    manager: "Vikram Patil",
    status: "active",
    doj: "2020-06-18",
    profilePct: 71,
  },
];

export const MOCK_LEAVE_REQUESTS = [
  { id: "LR-2401", employee: "Priya Sharma", type: "Casual", from: "2026-08-10", to: "2026-08-11", days: 2, status: "pending", reason: "Family function" },
  { id: "LR-2402", employee: "Rahul Mehta", type: "Sick", from: "2026-08-05", to: "2026-08-05", days: 1, status: "approved", reason: "Fever" },
  { id: "LR-2403", employee: "Amit Verma", type: "Earned", from: "2026-08-18", to: "2026-08-22", days: 5, status: "pending", reason: "Vacation" },
  { id: "LR-2404", employee: "Sneha Kulkarni", type: "Casual", from: "2026-08-12", to: "2026-08-12", days: 1, status: "rejected", reason: "Personal work" },
  { id: "LR-2405", employee: "Deepak Singh", type: "Comp-off", from: "2026-08-08", to: "2026-08-08", days: 1, status: "approved", reason: "Sunday market duty" },
];

export const MOCK_ATTENDANCE = [
  { date: "2026-08-03", emp: "Priya Sharma", in: "09:12", out: "18:05", status: "present", hours: "8.9" },
  { date: "2026-08-03", emp: "Rahul Mehta", in: "09:45", out: "18:20", status: "late", hours: "8.6" },
  { date: "2026-08-03", emp: "Sneha Kulkarni", in: "09:02", out: "13:00", status: "half-day", hours: "4.0" },
  { date: "2026-08-03", emp: "Amit Verma", in: "—", out: "—", status: "on-leave", hours: "0" },
  { date: "2026-08-03", emp: "Neha Gupta", in: "—", out: "—", status: "absent", hours: "0" },
  { date: "2026-08-03", emp: "Deepak Singh", in: "08:55", out: "19:10", status: "present", hours: "10.3" },
];

export const MOCK_PAYROLL = [
  { cycle: "Jul 2026", employees: 248, gross: "₹1.82 Cr", net: "₹1.54 Cr", status: "processed", paidOn: "2026-07-31" },
  { cycle: "Jun 2026", employees: 246, gross: "₹1.79 Cr", net: "₹1.51 Cr", status: "processed", paidOn: "2026-06-30" },
  { cycle: "Aug 2026", employees: 251, gross: "₹1.86 Cr", net: "—", status: "in-progress", paidOn: "—" },
];

export const MOCK_CANDIDATES = [
  { id: "C-901", name: "Arjun Reddy", role: "HR Executive", stage: "Interview", source: "Naukri", rating: 4.2, status: "active" },
  { id: "C-902", name: "Kavita Nair", role: "Payroll Specialist", stage: "Offer", source: "Referral", rating: 4.6, status: "offer-sent" },
  { id: "C-903", name: "Mohit Jain", role: "Recruiter", stage: "Screening", source: "LinkedIn", rating: 3.8, status: "active" },
  { id: "C-904", name: "Pooja Rane", role: "L&D Manager", stage: "Joined", source: "Agency", rating: 4.8, status: "joined" },
];

export const MOCK_ASSETS = [
  { id: "AST-441", type: "Laptop", tag: "DL-MBP-14", assignedTo: "Priya Sharma", issued: "2024-02-10", status: "assigned" },
  { id: "AST-442", type: "Mobile", tag: "DL-MOB-88", assignedTo: "Rahul Mehta", issued: "2023-11-01", status: "assigned" },
  { id: "AST-443", type: "ID Card", tag: "DL-ID-1188", assignedTo: "Rahul Mehta", issued: "2021-08-01", status: "assigned" },
  { id: "AST-444", type: "Laptop", tag: "DL-LEN-22", assignedTo: "—", issued: "—", status: "available" },
];

export const MOCK_DOCUMENTS = [
  { id: "D1", name: "Aadhaar Card.pdf", folder: "Government", owner: "Priya Sharma", uploadedBy: "Self", status: "verified", expiry: "—", version: "v1", size: "1.2 MB" },
  { id: "D2", name: "PAN Card.pdf", folder: "Government", owner: "Priya Sharma", uploadedBy: "Self", status: "verified", expiry: "—", version: "v1", size: "420 KB" },
  { id: "D3", name: "Offer Letter.pdf", folder: "HR Letters", owner: "Priya Sharma", uploadedBy: "HR Admin", status: "verified", expiry: "—", version: "v2", size: "860 KB" },
  { id: "D4", name: "Leave Policy 2026.pdf", folder: "Policies", owner: "All Employees", uploadedBy: "HR Admin", status: "published", expiry: "2027-03-31", version: "v3", size: "2.1 MB" },
  { id: "D5", name: "Form 16 FY25.pdf", folder: "Certificates", owner: "Priya Sharma", uploadedBy: "Payroll", status: "pending", expiry: "—", version: "v1", size: "540 KB" },
  { id: "D6", name: "Medical Certificate.pdf", folder: "My Documents", owner: "Amit Verma", uploadedBy: "Self", status: "expired", expiry: "2026-01-15", version: "v1", size: "1.0 MB" },
];

export const MOCK_DEPARTMENTS = [
  { code: "HR", name: "Human Resources", head: "Ananya Deshmukh", count: 12, status: "active" },
  { code: "FIN", name: "Finance & Accounts", head: "Meera Joshi", count: 18, status: "active" },
  { code: "SAL", name: "Sales", head: "Vikram Patil", count: 64, status: "active" },
  { code: "WH", name: "Warehouse", head: "Suresh Nair", count: 28, status: "active" },
  { code: "IT", name: "Information Technology", head: "Karthik Iyer", count: 9, status: "active" },
];

export const MOCK_SHIFTS = [
  { code: "GEN", name: "General", start: "09:00", end: "18:00", breakMins: 60, grace: 15 },
  { code: "FLD", name: "Field Force", start: "08:30", end: "17:30", breakMins: 45, grace: 30 },
  { code: "WH1", name: "Warehouse A", start: "07:00", end: "16:00", breakMins: 45, grace: 10 },
];

export const HR_NAV_GROUPS = [
  {
    label: "My Workspace",
    items: [
      { id: "home", label: "Home", icon: "Home" },
      { id: "attendance", label: "Attendance", icon: "Clock" },
      { id: "leave", label: "Leave", icon: "CalendarDays" },
      { id: "payroll", label: "Payslips", icon: "Wallet" },
      { id: "docs", label: "My Documents", icon: "FolderOpen" },
    ],
  },
  {
    label: "People",
    items: [
      { id: "directory", label: "Employee Directory", icon: "Users" },
      { id: "org", label: "Organization", icon: "Building2" },
      { id: "dept", label: "Departments", icon: "Network" },
      { id: "desig", label: "Designations", icon: "BadgeCheck" },
    ],
  },
  {
    label: "Talent",
    items: [
      { id: "recruit", label: "Recruitment", icon: "UserPlus" },
      { id: "offer", label: "Offer Letters", icon: "FileSignature" },
      { id: "joining", label: "Joining", icon: "UserCheck" },
      { id: "exit", label: "Exit Process", icon: "LogOut" },
    ],
  },
  {
    label: "Compensation",
    items: [
      { id: "payroll-run", label: "Payroll Processing", icon: "Calculator" },
      { id: "revision", label: "Salary Revision", icon: "TrendingUp" },
      { id: "claims", label: "Expense Claims", icon: "Receipt" },
    ],
  },
  {
    label: "Admin",
    items: [
      { id: "shift", label: "Shifts", icon: "Timer" },
      { id: "holiday", label: "Holidays", icon: "TreePalm" },
      { id: "assets", label: "Assets", icon: "Laptop" },
      { id: "approvals", label: "Approvals", icon: "CheckSquare" },
      { id: "perf", label: "Performance", icon: "Target" },
    ],
  },
];

export function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
