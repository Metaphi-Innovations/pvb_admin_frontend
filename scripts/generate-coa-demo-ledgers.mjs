import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const content = fs.readFileSync(
  path.join(root, "app/(app)/accounts/masters/coa-demo-ledgers.ts"),
  "utf8",
);

const entries = [...content.matchAll(/\{ subGroup: "([^"]+)", name: "([^"]+)", accountType: "([^"]+)" \}/g)].map(
  (m) => ({ subGroup: m[1], name: m[2], accountType: m[3] }),
);

/** Curated demo ledgers — max 2 per posting group; names aligned with voucher seeders. */
const KEEP = {
  "Accounting Charges": ["Statutory Audit Fees", "Internal Audit Fees"],
  "Accrued Income": ["SBI FD Interest", "HDFC FD Interest"],
  "Advance Received from Customers": ["Advance from ABC Agro Distributor", "Season Advance - Kharif 2026"],
  "Advertisement & Marketing": ["Farmer Awareness Campaign", "Google Ads"],
  "Audit Fees": ["Statutory Audit Fees", "Tax Audit Fees"],
  "Bank Charges": ["HDFC Bank Service Charges", "RTGS / NEFT Transaction Charges"],
  "Bank Loans": ["HDFC Working Capital Loan", "SBI Cash Credit Limit"],
  Bonus: ["Festival Bonus - Diwali", "Annual Performance Bonus"],
  "Business Development Expenses": ["Dealer Conference Expense", "Market Survey & Research"],
  "Cash-in-Hand": ["Main Cash", "Petty Cash"],
  "Commission Income": ["Dealer Incentive Earned", "Channel Partner Commission"],
  "Commission Paid": ["Dealer Commission Expense", "Field Agent Commission"],
  "Computers & IT Equipment": ["Dell Laptop", "Server Machine"],
  "Consultancy Charges": ["Management Consultancy Expense", "ERP Implementation Consultancy"],
  "Cost of Goods Sold": ["Cost of Fertilizers Sold", "Cost of Seeds Sold"],
  Deposits: ["Rent Deposit - Branch Office", "Electricity Security Deposit - HO"],
  "Depreciation & Amortisation": ["Depreciation - Plant & Machinery", "Depreciation - Vehicles"],
  "Direct Labour": ["Packing Labour Charges", "Loading & Unloading Labour"],
  "Director / Related Party Loans": ["Loan from Director - Krishnamurthy", "Related Party Unsecured Loan"],
  "Discount Received": ["Bulk Purchase Discount", "Early Payment Discount Earned"],
  "Dividend Income": ["Dividend from AgroCo Ltd", "Mutual Fund Dividend Income"],
  Drawings: ["Partner Drawings Account", "Director Drawings - FY 2026"],
  Electricity: ["Plant Electricity", "Office Electricity"],
  "Expenses Payable": ["Electricity Charges Payable", "Professional Fees Payable"],
  "Foreign Exchange Gain": ["Forex Revaluation Gain", "Export Realisation Gain"],
  "Foreign Exchange Loss": ["Forex Revaluation Loss", "Forex Loss - Import Payments"],
  "Freight Inward": ["Transport - Fertilizer Inward", "Rail Freight - Bulk Fertilizer"],
  "Freight Outward": ["Transport - Distributor Deliveries", "Last Mile Delivery Expense"],
  "Furniture & Fixtures": ["Office Furniture - HO", "Warehouse Racking & Shelving"],
  "GST Late Fees / Penalty": ["GSTR-3B Late Filing Charges", "GST Penalty & Interest"],
  "GST Payable": ["GST Payable Control Account", "GST Interest & Penalty Payable"],
  Housekeeping: ["Housekeeping Charges", "Pest Control Expense"],
  Incentives: ["Sales Commission Expense", "Target Achievement Incentive"],
  "Intangible Assets": ["ERP Software License", "Brand & Trademark Value"],
  "Interest Expense": ["Interest on Working Capital Loan", "Bank Overdraft Interest"],
  "Interest Income": ["Bank Interest - HDFC Current Account", "FD Interest Income"],
  "Inventory / Stock-in-Hand": ["Urea 50kg Stock", "DAP Fertilizer Stock"],
  "Job Work Charges": ["Custom Blending Job Work", "Bagging & Labelling Job Work"],
  "Land & Building": ["Head Office Building", "Warehouse Land & Structure"],
  "Legal Fees": ["Legal Retainer Fees", "Contract Drafting & Vetting Fees"],
  "Loan Processing Charges": ["HDFC Loan Processing Fee", "SBI Loan Documentation Charges"],
  "Loans & Advances Given": ["Staff Advance - Sales Team", "Dealer Security Deposit"],
  "Long-Term Investments": ["Equity Shares - AgroCo Ltd", "NABARD Infrastructure Bonds"],
  "Manufacturing Expenses": ["Factory Overheads", "Power & Fuel - Plant"],
  "Miscellaneous Expenses": ["Rounding Off Differences", "Miscellaneous Administrative Expense"],
  "Miscellaneous Income": ["Sundry Receipts", "Insurance Claim Received"],
  "NBFC Loans": ["Mahindra Finance Term Loan", "Tata Capital Business Loan"],
  "Office Equipment": ["Air Conditioning Units", "Fire Safety Equipment"],
  "Office Expenses": ["Office Supplies & Materials", "Courier & Postage Expense"],
  "Other Current Assets": ["Input Tax Credit Receivable", "TDS Receivable"],
  "Other Current Liabilities": ["Customer Refund Liability", "Sundry Payables - Others"],
  "Other Government Fees": ["Factory License Renewal Fees", "Shop & Establishment License Fees"],
  "Other Investments": ["Post Office Savings Deposit", "Rural Electrification Bonds"],
  "Other Operating Income": ["Scrap Sales Income", "Handling Charges Recovered"],
  "Other Provisions": ["Provision for Bad & Doubtful Debts", "Provision for Warranty Claims"],
  "Packing Expenses": ["HDPE Bag Purchase", "Carton Box Expense"],
  "PF / ESIC Payable": ["PF Payable - Employee Contribution", "ESIC Payable"],
  "Plant & Machinery": ["Fertilizer Blending Machine", "Conveyor & Material Handling System"],
  "Prepaid Expenses": ["Prepaid Office Rent", "Prepaid Insurance - Plant & Machinery"],
  "Printing & Stationery": ["Office Stationery", "Invoice & Bill Printing"],
  "Professional Fees": ["CA Fees", "Tax Consultant Fees"],
  "Professional Fees Income": ["Agri Consultancy Fees Received", "Technical Audit Fee Income"],
  "Profit on Sale of Asset": ["Profit on Sale of Old Vehicle", "Profit on Sale of Plant Equipment"],
  "Proprietor / Partner / Shareholder Capital": ["Partner Capital Account", "Promoter Capital - Krishnamurthy Agro"],
  "Provision for Audit Fees": ["Provision for Statutory Audit", "Provision for Tax Audit Fees"],
  "Provision for Expenses": ["Provision for Gratuity", "Provision for Annual Bonus"],
  "Provision for Tax": ["Provision for Income Tax FY26", "Provision for GST Liability"],
  Purchases: ["Fertilizer Purchase", "Seed Purchase"],
  "Recruitment Expenses": ["Recruitment Agency Fee", "Job Portal Subscription Fee"],
  Rent: ["Office Rent", "Warehouse Rent"],
  "Rent Income": ["Warehouse Rental Income", "Office Space Rental Income"],
  "Repairs & Maintenance": ["Plant & Equipment Servicing", "Vehicle Maintenance & Service"],
  "Reserves & Surplus": ["General Reserve", "Capital Reserve"],
  "Retained Earnings": ["Accumulated Surplus - Prior Years", "Current Year Retained Profit"],
  "ROC Fees": ["ROC Annual Filing Fees", "Annual Return Filing Fees"],
  "Salaries & Wages": ["HO Salary Expense", "Warehouse Staff Salary Expense"],
  "Salary Payable": ["Salary Payable - HO Staff", "Incentive & Bonus Payable"],
  Sales: ["Fertilizer Sales", "Seed Sales"],
  "Sales Promotion": ["Farmer Field Trial Expense", "Dealer Meet Expense"],
  "Secured Loans": ["HDFC Term Loan - Plant & Machinery", "SBI Secured Loan - Warehouse"],
  "Service Revenue": ["Agronomy Consulting Revenue", "Soil Testing Service Revenue"],
  "Short-Term Investments": ["Fixed Deposit - HDFC Bank", "Liquid Mutual Fund - HDFC AMC"],
  "Staff Welfare": ["Employee Medical Expense", "Staff Training & Development"],
  "TDS Late Fees / Penalty": ["TDS Late Deposit Charges", "TDS Penalty & Interest"],
  "TDS Payable": ["TDS Payable - Sec 192 (Salary)", "TDS Payable - Sec 194C (Contractors)"],
  "Telephone & Internet": ["Internet Broadband Expense", "Office Landline Charges"],
  "Unsecured Loans": ["Unsecured Loan from Promoter", "Working Capital Unsecured Loan"],
  Vehicles: ["Delivery Van MH-12-AB-1234", "Company Car MH-12-XY-5678"],
};

/** Subgroups with statutory system ledgers — demo seeds are not bundled. */
const SKIP_STATUTORY = new Set([
  "duties & taxes payable",
  "gst input",
  "gst input credit",
  "gst output",
  "tds payable",
  "gst payable",
]);

const groups = [...new Set(entries.map((e) => e.subGroup))].filter(
  (g) => !SKIP_STATUTORY.has(g.trim().toLowerCase()),
);
const missing = groups.filter((g) => !KEEP[g]);
if (missing.length) {
  console.error("Missing KEEP entries:", missing);
  process.exit(1);
}

const out = [];
for (const g of groups) {
  const type = entries.find((e) => e.subGroup === g).accountType;
  for (const name of KEEP[g].slice(0, 2)) {
    out.push({ subGroup: g, name, accountType: type });
  }
}

const lines = [
  'import type { AccountType } from "../data";',
  "",
  "export interface CoaDemoLedgerSeed {",
  "  subGroup: string;",
  "  name: string;",
  "  accountType: AccountType;",
  "}",
  "",
  "/**",
  " * Demo ledger entries — 2 per leaf COA posting group (clean, realistic agri-ERP sample data).",
  " * Bundled at build time via coa-demo-bundle.ts (not localStorage).",
  " * Bank Accounts, Sundry Debtors, and Sundry Creditors are in coa-demo-bundle.ts.",
  " */",
  "export const COA_DEMO_LEDGER_SEEDS: CoaDemoLedgerSeed[] = [",
];

let currentGroup = "";
for (const e of out) {
  if (e.subGroup !== currentGroup) {
    if (currentGroup) lines.push("");
    lines.push(`  // ${e.subGroup}`);
    currentGroup = e.subGroup;
  }
  lines.push(`  { subGroup: "${e.subGroup}", name: "${e.name}", accountType: "${e.accountType}" },`);
}
lines.push("];");
lines.push("");

const target = path.join(root, "app/(app)/accounts/masters/coa-demo-ledgers.ts");
fs.writeFileSync(target, lines.join("\n"));
console.log(`Wrote ${out.length} ledgers across ${groups.length} groups to ${target}`);
