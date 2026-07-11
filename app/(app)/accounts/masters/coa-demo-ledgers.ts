import type { AccountType } from "../data";

export interface CoaDemoLedgerSeed {
  subGroup: string;
  name: string;
  accountType: AccountType;
}

/**
 * Demo ledger entries — 2 per leaf COA posting group (clean, realistic agri-ERP sample data).
 * Bundled at build time via coa-demo-bundle.ts (not localStorage).
 * Bank Accounts, Sundry Debtors, and Sundry Creditors are in coa-demo-bundle.ts.
 */
export const COA_DEMO_LEDGER_SEEDS: CoaDemoLedgerSeed[] = [
  // Accounting Charges
  { subGroup: "Accounting Charges", name: "Statutory Audit Fees", accountType: "Expense" },
  { subGroup: "Accounting Charges", name: "Internal Audit Fees", accountType: "Expense" },

  // Accrued Income
  { subGroup: "Accrued Income", name: "SBI FD Interest", accountType: "Asset" },
  { subGroup: "Accrued Income", name: "HDFC FD Interest", accountType: "Asset" },

  // Advance Received from Customers
  { subGroup: "Advance Received from Customers", name: "Advance from ABC Agro Distributor", accountType: "Liability" },
  { subGroup: "Advance Received from Customers", name: "Season Advance - Kharif 2026", accountType: "Liability" },

  // Advertisement & Marketing
  { subGroup: "Advertisement & Marketing", name: "Farmer Awareness Campaign", accountType: "Expense" },
  { subGroup: "Advertisement & Marketing", name: "Google Ads", accountType: "Expense" },

  // Audit Fees
  { subGroup: "Audit Fees", name: "Statutory Audit Fees", accountType: "Expense" },
  { subGroup: "Audit Fees", name: "Tax Audit Fees", accountType: "Expense" },

  // Bank Charges
  { subGroup: "Bank Charges", name: "HDFC Bank Service Charges", accountType: "Expense" },
  { subGroup: "Bank Charges", name: "RTGS / NEFT Transaction Charges", accountType: "Expense" },

  // Bank Loans
  { subGroup: "Bank Loans", name: "HDFC Working Capital Loan", accountType: "Liability" },
  { subGroup: "Bank Loans", name: "SBI Cash Credit Limit", accountType: "Liability" },

  // Bonus
  { subGroup: "Bonus", name: "Festival Bonus - Diwali", accountType: "Expense" },
  { subGroup: "Bonus", name: "Annual Performance Bonus", accountType: "Expense" },

  // Business Development Expenses
  { subGroup: "Business Development Expenses", name: "Dealer Conference Expense", accountType: "Expense" },
  { subGroup: "Business Development Expenses", name: "Market Survey & Research", accountType: "Expense" },

  // Cash-in-Hand
  { subGroup: "Cash-in-Hand", name: "Main Cash", accountType: "Asset" },
  { subGroup: "Cash-in-Hand", name: "Petty Cash", accountType: "Asset" },

  // Commission Income
  { subGroup: "Commission Income", name: "Dealer Incentive Earned", accountType: "Income" },
  { subGroup: "Commission Income", name: "Channel Partner Commission", accountType: "Income" },

  // Commission Paid
  { subGroup: "Commission Paid", name: "Dealer Commission Expense", accountType: "Expense" },
  { subGroup: "Commission Paid", name: "Field Agent Commission", accountType: "Expense" },

  // Computers & IT Equipment
  { subGroup: "Computers & IT Equipment", name: "Dell Laptop", accountType: "Asset" },
  { subGroup: "Computers & IT Equipment", name: "Server Machine", accountType: "Asset" },

  // Consultancy Charges
  { subGroup: "Consultancy Charges", name: "Management Consultancy Expense", accountType: "Expense" },
  { subGroup: "Consultancy Charges", name: "ERP Implementation Consultancy", accountType: "Expense" },

  // Cost of Goods Sold
  { subGroup: "Cost of Goods Sold", name: "Cost of Fertilizers Sold", accountType: "Expense" },
  { subGroup: "Cost of Goods Sold", name: "Cost of Seeds Sold", accountType: "Expense" },

  // Deposits
  { subGroup: "Deposits", name: "Rent Deposit - Branch Office", accountType: "Asset" },
  { subGroup: "Deposits", name: "Electricity Security Deposit - HO", accountType: "Asset" },

  // Depreciation & Amortisation
  { subGroup: "Depreciation & Amortisation", name: "Depreciation - Plant & Machinery", accountType: "Expense" },
  { subGroup: "Depreciation & Amortisation", name: "Depreciation - Vehicles", accountType: "Expense" },

  // Direct Labour
  { subGroup: "Direct Labour", name: "Packing Labour Charges", accountType: "Expense" },
  { subGroup: "Direct Labour", name: "Loading & Unloading Labour", accountType: "Expense" },

  // Director / Related Party Loans
  { subGroup: "Director / Related Party Loans", name: "Loan from Director - Krishnamurthy", accountType: "Liability" },
  { subGroup: "Director / Related Party Loans", name: "Related Party Unsecured Loan", accountType: "Liability" },

  // Discount Received
  { subGroup: "Discount Received", name: "Bulk Purchase Discount", accountType: "Income" },
  { subGroup: "Discount Received", name: "Early Payment Discount Earned", accountType: "Income" },

  // Dividend Income
  { subGroup: "Dividend Income", name: "Dividend from AgroCo Ltd", accountType: "Income" },
  { subGroup: "Dividend Income", name: "Mutual Fund Dividend Income", accountType: "Income" },

  // Drawings
  { subGroup: "Drawings", name: "Partner Drawings Account", accountType: "Liability" },
  { subGroup: "Drawings", name: "Director Drawings - FY 2026", accountType: "Liability" },

  // Electricity
  { subGroup: "Electricity", name: "Plant Electricity", accountType: "Expense" },
  { subGroup: "Electricity", name: "Office Electricity", accountType: "Expense" },

  // Expenses Payable
  { subGroup: "Expenses Payable", name: "Electricity Charges Payable", accountType: "Liability" },
  { subGroup: "Expenses Payable", name: "Professional Fees Payable", accountType: "Liability" },

  // Foreign Exchange Gain
  { subGroup: "Foreign Exchange Gain", name: "Forex Revaluation Gain", accountType: "Income" },
  { subGroup: "Foreign Exchange Gain", name: "Export Realisation Gain", accountType: "Income" },

  // Foreign Exchange Loss
  { subGroup: "Foreign Exchange Loss", name: "Forex Revaluation Loss", accountType: "Expense" },
  { subGroup: "Foreign Exchange Loss", name: "Forex Loss - Import Payments", accountType: "Expense" },

  // Freight Inward
  { subGroup: "Freight Inward", name: "Transport - Fertilizer Inward", accountType: "Expense" },
  { subGroup: "Freight Inward", name: "Rail Freight - Bulk Fertilizer", accountType: "Expense" },

  // Freight Outward
  { subGroup: "Freight Outward", name: "Transport - Distributor Deliveries", accountType: "Expense" },
  { subGroup: "Freight Outward", name: "Last Mile Delivery Expense", accountType: "Expense" },

  // Furniture & Fixtures
  { subGroup: "Furniture & Fixtures", name: "Office Furniture - HO", accountType: "Asset" },
  { subGroup: "Furniture & Fixtures", name: "Warehouse Racking & Shelving", accountType: "Asset" },

  // GST Late Fees / Penalty
  { subGroup: "GST Late Fees / Penalty", name: "GSTR-3B Late Filing Charges", accountType: "Expense" },
  { subGroup: "GST Late Fees / Penalty", name: "GST Penalty & Interest", accountType: "Expense" },

  // Housekeeping
  { subGroup: "Housekeeping", name: "Housekeeping Charges", accountType: "Expense" },
  { subGroup: "Housekeeping", name: "Pest Control Expense", accountType: "Expense" },

  // Incentives
  { subGroup: "Incentives", name: "Sales Commission Expense", accountType: "Expense" },
  { subGroup: "Incentives", name: "Target Achievement Incentive", accountType: "Expense" },

  // Intangible Assets
  { subGroup: "Intangible Assets", name: "ERP Software License", accountType: "Asset" },
  { subGroup: "Intangible Assets", name: "Brand & Trademark Value", accountType: "Asset" },

  // Interest Expense
  { subGroup: "Interest Expense", name: "Interest on Working Capital Loan", accountType: "Expense" },
  { subGroup: "Interest Expense", name: "Bank Overdraft Interest", accountType: "Expense" },

  // Interest Income
  { subGroup: "Interest Income", name: "Bank Interest - HDFC Current Account", accountType: "Income" },
  { subGroup: "Interest Income", name: "FD Interest Income", accountType: "Income" },

  // Inventory / Stock-in-Hand
  { subGroup: "Inventory / Stock-in-Hand", name: "Urea 50kg Stock", accountType: "Asset" },
  { subGroup: "Inventory / Stock-in-Hand", name: "DAP Fertilizer Stock", accountType: "Asset" },

  // Job Work Charges
  { subGroup: "Job Work Charges", name: "Custom Blending Job Work", accountType: "Expense" },
  { subGroup: "Job Work Charges", name: "Bagging & Labelling Job Work", accountType: "Expense" },

  // Land & Building
  { subGroup: "Land & Building", name: "Head Office Building", accountType: "Asset" },
  { subGroup: "Land & Building", name: "Warehouse Land & Structure", accountType: "Asset" },

  // Legal Fees
  { subGroup: "Legal Fees", name: "Legal Retainer Fees", accountType: "Expense" },
  { subGroup: "Legal Fees", name: "Contract Drafting & Vetting Fees", accountType: "Expense" },

  // Loan Processing Charges
  { subGroup: "Loan Processing Charges", name: "HDFC Loan Processing Fee", accountType: "Expense" },
  { subGroup: "Loan Processing Charges", name: "SBI Loan Documentation Charges", accountType: "Expense" },

  // Loans & Advances Given
  { subGroup: "Loans & Advances Given", name: "Staff Advance - Sales Team", accountType: "Asset" },
  { subGroup: "Loans & Advances Given", name: "Dealer Security Deposit", accountType: "Asset" },

  // Long-Term Investments
  { subGroup: "Long-Term Investments", name: "Equity Shares - AgroCo Ltd", accountType: "Asset" },
  { subGroup: "Long-Term Investments", name: "NABARD Infrastructure Bonds", accountType: "Asset" },

  // Manufacturing Expenses
  { subGroup: "Manufacturing Expenses", name: "Factory Overheads", accountType: "Expense" },
  { subGroup: "Manufacturing Expenses", name: "Power & Fuel - Plant", accountType: "Expense" },

  // Miscellaneous Expenses
  { subGroup: "Miscellaneous Expenses", name: "Rounding Off Differences", accountType: "Expense" },
  { subGroup: "Miscellaneous Expenses", name: "Miscellaneous Administrative Expense", accountType: "Expense" },

  // Miscellaneous Income
  { subGroup: "Miscellaneous Income", name: "Sundry Receipts", accountType: "Income" },
  { subGroup: "Miscellaneous Income", name: "Insurance Claim Received", accountType: "Income" },

  // NBFC Loans
  { subGroup: "NBFC Loans", name: "Mahindra Finance Term Loan", accountType: "Liability" },
  { subGroup: "NBFC Loans", name: "Tata Capital Business Loan", accountType: "Liability" },

  // Office Equipment
  { subGroup: "Office Equipment", name: "Air Conditioning Units", accountType: "Asset" },
  { subGroup: "Office Equipment", name: "Fire Safety Equipment", accountType: "Asset" },

  // Office Expenses
  { subGroup: "Office Expenses", name: "Office Supplies & Materials", accountType: "Expense" },
  { subGroup: "Office Expenses", name: "Courier & Postage Expense", accountType: "Expense" },

  // Other Current Assets
  { subGroup: "Other Current Assets", name: "Input Tax Credit Receivable", accountType: "Asset" },
  { subGroup: "Other Current Assets", name: "TDS Receivable", accountType: "Asset" },

  // Other Current Liabilities
  { subGroup: "Other Current Liabilities", name: "Customer Refund Liability", accountType: "Liability" },
  { subGroup: "Other Current Liabilities", name: "Sundry Payables - Others", accountType: "Liability" },

  // Other Government Fees
  { subGroup: "Other Government Fees", name: "Factory License Renewal Fees", accountType: "Expense" },
  { subGroup: "Other Government Fees", name: "Shop & Establishment License Fees", accountType: "Expense" },

  // Other Investments
  { subGroup: "Other Investments", name: "Post Office Savings Deposit", accountType: "Asset" },
  { subGroup: "Other Investments", name: "Rural Electrification Bonds", accountType: "Asset" },

  // Other Operating Income
  { subGroup: "Other Operating Income", name: "Scrap Sales Income", accountType: "Income" },
  { subGroup: "Other Operating Income", name: "Handling Charges Recovered", accountType: "Income" },

  // Other Provisions
  { subGroup: "Other Provisions", name: "Provision for Bad & Doubtful Debts", accountType: "Liability" },
  { subGroup: "Other Provisions", name: "Provision for Warranty Claims", accountType: "Liability" },

  // Packing Expenses
  { subGroup: "Packing Expenses", name: "HDPE Bag Purchase", accountType: "Expense" },
  { subGroup: "Packing Expenses", name: "Carton Box Expense", accountType: "Expense" },

  // PF / ESIC Payable
  { subGroup: "PF / ESIC Payable", name: "PF Payable - Employee Contribution", accountType: "Liability" },
  { subGroup: "PF / ESIC Payable", name: "ESIC Payable", accountType: "Liability" },

  // Plant & Machinery
  { subGroup: "Plant & Machinery", name: "Fertilizer Blending Machine", accountType: "Asset" },
  { subGroup: "Plant & Machinery", name: "Conveyor & Material Handling System", accountType: "Asset" },

  // Prepaid Expenses
  { subGroup: "Prepaid Expenses", name: "Prepaid Office Rent", accountType: "Asset" },
  { subGroup: "Prepaid Expenses", name: "Prepaid Insurance - Plant & Machinery", accountType: "Asset" },

  // Printing & Stationery
  { subGroup: "Printing & Stationery", name: "Office Stationery", accountType: "Expense" },
  { subGroup: "Printing & Stationery", name: "Invoice & Bill Printing", accountType: "Expense" },

  // Professional Fees
  { subGroup: "Professional Fees", name: "CA Fees", accountType: "Expense" },
  { subGroup: "Professional Fees", name: "Tax Consultant Fees", accountType: "Expense" },

  // Professional Fees Income
  { subGroup: "Professional Fees Income", name: "Agri Consultancy Fees Received", accountType: "Income" },
  { subGroup: "Professional Fees Income", name: "Technical Audit Fee Income", accountType: "Income" },

  // Profit on Sale of Asset
  { subGroup: "Profit on Sale of Asset", name: "Profit on Sale of Old Vehicle", accountType: "Income" },
  { subGroup: "Profit on Sale of Asset", name: "Profit on Sale of Plant Equipment", accountType: "Income" },

  // Proprietor / Partner / Shareholder Capital
  { subGroup: "Proprietor / Partner / Shareholder Capital", name: "Partner Capital Account", accountType: "Liability" },
  { subGroup: "Proprietor / Partner / Shareholder Capital", name: "Promoter Capital - Krishnamurthy Agro", accountType: "Liability" },

  // Provision for Audit Fees
  { subGroup: "Provision for Audit Fees", name: "Provision for Statutory Audit", accountType: "Liability" },
  { subGroup: "Provision for Audit Fees", name: "Provision for Tax Audit Fees", accountType: "Liability" },

  // Provision for Expenses
  { subGroup: "Provision for Expenses", name: "Provision for Gratuity", accountType: "Liability" },
  { subGroup: "Provision for Expenses", name: "Provision for Annual Bonus", accountType: "Liability" },

  // Provision for Tax
  { subGroup: "Provision for Tax", name: "Provision for Income Tax FY26", accountType: "Liability" },
  { subGroup: "Provision for Tax", name: "Provision for GST Liability", accountType: "Liability" },

  // Purchases
  { subGroup: "Purchases", name: "Fertilizer Purchase", accountType: "Expense" },
  { subGroup: "Purchases", name: "Seed Purchase", accountType: "Expense" },

  // Recruitment Expenses
  { subGroup: "Recruitment Expenses", name: "Recruitment Agency Fee", accountType: "Expense" },
  { subGroup: "Recruitment Expenses", name: "Job Portal Subscription Fee", accountType: "Expense" },

  // Rent
  { subGroup: "Rent", name: "Office Rent", accountType: "Expense" },
  { subGroup: "Rent", name: "Warehouse Rent", accountType: "Expense" },

  // Rent Income
  { subGroup: "Rent Income", name: "Warehouse Rental Income", accountType: "Income" },
  { subGroup: "Rent Income", name: "Office Space Rental Income", accountType: "Income" },

  // Repairs & Maintenance
  { subGroup: "Repairs & Maintenance", name: "Plant & Equipment Servicing", accountType: "Expense" },
  { subGroup: "Repairs & Maintenance", name: "Vehicle Maintenance & Service", accountType: "Expense" },

  // Reserves & Surplus
  { subGroup: "Reserves & Surplus", name: "General Reserve", accountType: "Liability" },
  { subGroup: "Reserves & Surplus", name: "Capital Reserve", accountType: "Liability" },

  // Retained Earnings
  { subGroup: "Retained Earnings", name: "Accumulated Surplus - Prior Years", accountType: "Liability" },
  { subGroup: "Retained Earnings", name: "Current Year Retained Profit", accountType: "Liability" },

  // ROC Fees
  { subGroup: "ROC Fees", name: "ROC Annual Filing Fees", accountType: "Expense" },
  { subGroup: "ROC Fees", name: "Annual Return Filing Fees", accountType: "Expense" },

  // Salaries & Wages
  { subGroup: "Salaries & Wages", name: "HO Salary Expense", accountType: "Expense" },
  { subGroup: "Salaries & Wages", name: "Warehouse Staff Salary Expense", accountType: "Expense" },

  // Salary Payable
  { subGroup: "Salary Payable", name: "Salary Payable - HO Staff", accountType: "Liability" },
  { subGroup: "Salary Payable", name: "Incentive & Bonus Payable", accountType: "Liability" },

  // Sales
  { subGroup: "Sales", name: "Fertilizer Sales", accountType: "Income" },
  { subGroup: "Sales", name: "Seed Sales", accountType: "Income" },

  // Sales Promotion
  { subGroup: "Sales Promotion", name: "Farmer Field Trial Expense", accountType: "Expense" },
  { subGroup: "Sales Promotion", name: "Dealer Meet Expense", accountType: "Expense" },

  // Secured Loans
  { subGroup: "Secured Loans", name: "HDFC Term Loan - Plant & Machinery", accountType: "Liability" },
  { subGroup: "Secured Loans", name: "SBI Secured Loan - Warehouse", accountType: "Liability" },

  // Service Revenue
  { subGroup: "Service Revenue", name: "Agronomy Consulting Revenue", accountType: "Income" },
  { subGroup: "Service Revenue", name: "Soil Testing Service Revenue", accountType: "Income" },

  // Short-Term Investments
  { subGroup: "Short-Term Investments", name: "Fixed Deposit - HDFC Bank", accountType: "Asset" },
  { subGroup: "Short-Term Investments", name: "Liquid Mutual Fund - HDFC AMC", accountType: "Asset" },

  // Staff Welfare
  { subGroup: "Staff Welfare", name: "Employee Medical Expense", accountType: "Expense" },
  { subGroup: "Staff Welfare", name: "Staff Training & Development", accountType: "Expense" },

  // TDS Late Fees / Penalty
  { subGroup: "TDS Late Fees / Penalty", name: "TDS Late Deposit Charges", accountType: "Expense" },
  { subGroup: "TDS Late Fees / Penalty", name: "TDS Penalty & Interest", accountType: "Expense" },

  // Telephone & Internet
  { subGroup: "Telephone & Internet", name: "Internet Broadband Expense", accountType: "Expense" },
  { subGroup: "Telephone & Internet", name: "Office Landline Charges", accountType: "Expense" },

  // Unsecured Loans
  { subGroup: "Unsecured Loans", name: "Unsecured Loan from Promoter", accountType: "Liability" },
  { subGroup: "Unsecured Loans", name: "Working Capital Unsecured Loan", accountType: "Liability" },

  // Vehicles
  { subGroup: "Vehicles", name: "Delivery Van MH-12-AB-1234", accountType: "Asset" },
  { subGroup: "Vehicles", name: "Company Car MH-12-XY-5678", accountType: "Asset" },
];
