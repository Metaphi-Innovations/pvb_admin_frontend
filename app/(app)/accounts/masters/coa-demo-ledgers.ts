import type { AccountType } from "../data";

export interface CoaDemoLedgerSeed {
  subGroup: string;
  name: string;
  accountType: AccountType;
}

/**
 * Demo ledger entries — minimum 5 per leaf COA standard group.
 * Bank Accounts, Sundry Debtors, and Sundry Creditors are seeded via bank/customer/vendor masters.
 */
export const COA_DEMO_LEDGER_SEEDS: CoaDemoLedgerSeed[] = [
  // Accounting Charges
  { subGroup: "Accounting Charges", name: "Bookkeeping Service Charges", accountType: "Expense" },
  { subGroup: "Accounting Charges", name: "Financial Modelling Charges", accountType: "Expense" },
  { subGroup: "Accounting Charges", name: "Internal Audit Fees", accountType: "Expense" },
  { subGroup: "Accounting Charges", name: "Payroll Processing Charges", accountType: "Expense" },
  { subGroup: "Accounting Charges", name: "Virtual CFO Services", accountType: "Expense" },

  // Accrued Income
  { subGroup: "Accrued Income", name: "Accrued Bank Interest Income", accountType: "Asset" },
  { subGroup: "Accrued Income", name: "Accrued Dealer Commission Income", accountType: "Asset" },
  { subGroup: "Accrued Income", name: "Accrued Export Incentive", accountType: "Asset" },
  { subGroup: "Accrued Income", name: "Accrued Rent Receivable", accountType: "Asset" },
  { subGroup: "Accrued Income", name: "Unbilled Agronomy Service Revenue", accountType: "Asset" },

  // Advance Received from Customers
  { subGroup: "Advance Received from Customers", name: "Advance from ABC Agro Distributor", accountType: "Liability" },
  { subGroup: "Advance Received from Customers", name: "Advance from Green Harvest Agro", accountType: "Liability" },
  { subGroup: "Advance Received from Customers", name: "Advance from Shree Ganesh Seeds", accountType: "Liability" },
  { subGroup: "Advance Received from Customers", name: "Advance from Vidarbha Agro Mart", accountType: "Liability" },
  { subGroup: "Advance Received from Customers", name: "Season Advance - Kharif 2026", accountType: "Liability" },

  // Advertisement & Marketing
  { subGroup: "Advertisement & Marketing", name: "Agricultural Exhibition Expense", accountType: "Expense" },
  { subGroup: "Advertisement & Marketing", name: "Dealer Promotion Expense", accountType: "Expense" },
  { subGroup: "Advertisement & Marketing", name: "Facebook & Social Media Ads", accountType: "Expense" },
  { subGroup: "Advertisement & Marketing", name: "Farmer Awareness Campaign", accountType: "Expense" },
  { subGroup: "Advertisement & Marketing", name: "Google Ads", accountType: "Expense" },

  // Audit Fees
  { subGroup: "Audit Fees", name: "GST Audit Expense", accountType: "Expense" },
  { subGroup: "Audit Fees", name: "Internal Audit Fees", accountType: "Expense" },
  { subGroup: "Audit Fees", name: "Statutory Audit Fees", accountType: "Expense" },
  { subGroup: "Audit Fees", name: "Stock Audit Fees", accountType: "Expense" },
  { subGroup: "Audit Fees", name: "Tax Audit Fees", accountType: "Expense" },

  // Bank Charges
  { subGroup: "Bank Charges", name: "Cheque Book & DD Charges", accountType: "Expense" },
  { subGroup: "Bank Charges", name: "HDFC Bank Service Charges", accountType: "Expense" },
  { subGroup: "Bank Charges", name: "ICICI Bank Service Charges", accountType: "Expense" },
  { subGroup: "Bank Charges", name: "Payment Gateway Charges", accountType: "Expense" },
  { subGroup: "Bank Charges", name: "RTGS / NEFT Transaction Charges", accountType: "Expense" },

  // Bank Loans
  { subGroup: "Bank Loans", name: "Axis Bank Demand Loan", accountType: "Liability" },
  { subGroup: "Bank Loans", name: "Bank Overdraft Facility", accountType: "Liability" },
  { subGroup: "Bank Loans", name: "HDFC Working Capital Loan", accountType: "Liability" },
  { subGroup: "Bank Loans", name: "ICICI Packing Credit Facility", accountType: "Liability" },
  { subGroup: "Bank Loans", name: "SBI Cash Credit Limit", accountType: "Liability" },

  // Bonus
  { subGroup: "Bonus", name: "Annual Performance Bonus", accountType: "Expense" },
  { subGroup: "Bonus", name: "Festival Bonus - Diwali", accountType: "Expense" },
  { subGroup: "Bonus", name: "Production Bonus", accountType: "Expense" },
  { subGroup: "Bonus", name: "Retention Bonus", accountType: "Expense" },
  { subGroup: "Bonus", name: "Seasonal Incentive Payout", accountType: "Expense" },

  // Business Development Expenses
  { subGroup: "Business Development Expenses", name: "Client Meeting & Travel Expense", accountType: "Expense" },
  { subGroup: "Business Development Expenses", name: "Dealer Conference Expense", accountType: "Expense" },
  { subGroup: "Business Development Expenses", name: "Market Survey & Research", accountType: "Expense" },
  { subGroup: "Business Development Expenses", name: "New Market Development Expense", accountType: "Expense" },
  { subGroup: "Business Development Expenses", name: "Product Launch Event", accountType: "Expense" },

  // Cash-in-Hand
  { subGroup: "Cash-in-Hand", name: "Branch Counter Cash", accountType: "Asset" },
  { subGroup: "Cash-in-Hand", name: "Dispatch Counter Cash", accountType: "Asset" },
  { subGroup: "Cash-in-Hand", name: "Field Staff Cash Float", accountType: "Asset" },
  { subGroup: "Cash-in-Hand", name: "Office Petty Cash", accountType: "Asset" },
  { subGroup: "Cash-in-Hand", name: "Warehouse Petty Cash", accountType: "Asset" },

  // Commission Income
  { subGroup: "Commission Income", name: "Agency Commission - Seeds Division", accountType: "Income" },
  { subGroup: "Commission Income", name: "Channel Partner Commission", accountType: "Income" },
  { subGroup: "Commission Income", name: "Commission - AgroChem Traders", accountType: "Income" },
  { subGroup: "Commission Income", name: "Dealer Incentive Earned", accountType: "Income" },
  { subGroup: "Commission Income", name: "Referral Commission Income", accountType: "Income" },

  // Commission Paid
  { subGroup: "Commission Paid", name: "Agent Commission - Seeds Division", accountType: "Expense" },
  { subGroup: "Commission Paid", name: "CNF Commission Expense", accountType: "Expense" },
  { subGroup: "Commission Paid", name: "Dealer Commission Expense", accountType: "Expense" },
  { subGroup: "Commission Paid", name: "Field Agent Commission", accountType: "Expense" },
  { subGroup: "Commission Paid", name: "Referral Commission Paid", accountType: "Expense" },

  // Computers & IT Equipment
  { subGroup: "Computers & IT Equipment", name: "Dell Laptop", accountType: "Asset" },
  { subGroup: "Computers & IT Equipment", name: "HP Desktop", accountType: "Asset" },
  { subGroup: "Computers & IT Equipment", name: "Lenovo Laptop", accountType: "Asset" },
  { subGroup: "Computers & IT Equipment", name: "Printer & Scanner", accountType: "Asset" },
  { subGroup: "Computers & IT Equipment", name: "Server Machine", accountType: "Asset" },

  // Consultancy Charges
  { subGroup: "Consultancy Charges", name: "ERP Implementation Consultancy", accountType: "Expense" },
  { subGroup: "Consultancy Charges", name: "HR Consulting Charges", accountType: "Expense" },
  { subGroup: "Consultancy Charges", name: "IT System Consulting Expense", accountType: "Expense" },
  { subGroup: "Consultancy Charges", name: "Management Consultancy Expense", accountType: "Expense" },
  { subGroup: "Consultancy Charges", name: "Process Re-engineering Consultancy", accountType: "Expense" },

  // Cost of Goods Sold
  { subGroup: "Cost of Goods Sold", name: "Cost of Fertilizers Sold", accountType: "Expense" },
  { subGroup: "Cost of Goods Sold", name: "Cost of Micronutrients Sold", accountType: "Expense" },
  { subGroup: "Cost of Goods Sold", name: "Cost of Pesticides Sold", accountType: "Expense" },
  { subGroup: "Cost of Goods Sold", name: "Cost of Seeds Sold", accountType: "Expense" },
  { subGroup: "Cost of Goods Sold", name: "Inventory Adjustment - Write-off", accountType: "Expense" },

  // Deposits
  { subGroup: "Deposits", name: "Electricity Deposit - Warehouse", accountType: "Asset" },
  { subGroup: "Deposits", name: "Electricity Security Deposit - HO", accountType: "Asset" },
  { subGroup: "Deposits", name: "MIDC Industrial Deposit", accountType: "Asset" },
  { subGroup: "Deposits", name: "Rent Deposit - Branch Office", accountType: "Asset" },
  { subGroup: "Deposits", name: "Telecom Security Deposit", accountType: "Asset" },

  // Depreciation & Amortisation
  { subGroup: "Depreciation & Amortisation", name: "Amortisation - ERP Software License", accountType: "Expense" },
  { subGroup: "Depreciation & Amortisation", name: "Depreciation - Buildings", accountType: "Expense" },
  { subGroup: "Depreciation & Amortisation", name: "Depreciation - Computer Equipment", accountType: "Expense" },
  { subGroup: "Depreciation & Amortisation", name: "Depreciation - Plant & Machinery", accountType: "Expense" },
  { subGroup: "Depreciation & Amortisation", name: "Depreciation - Vehicles", accountType: "Expense" },

  // Direct Labour
  { subGroup: "Direct Labour", name: "Casual Labour - Warehouse", accountType: "Expense" },
  { subGroup: "Direct Labour", name: "Daily Wage - Field Operations", accountType: "Expense" },
  { subGroup: "Direct Labour", name: "Loading & Unloading Labour", accountType: "Expense" },
  { subGroup: "Direct Labour", name: "Packing Labour Charges", accountType: "Expense" },
  { subGroup: "Direct Labour", name: "Seasonal Harvest Labour", accountType: "Expense" },

  // Director / Related Party Loans
  { subGroup: "Director / Related Party Loans", name: "Inter-Company Loan Payable", accountType: "Liability" },
  { subGroup: "Director / Related Party Loans", name: "Loan from Director - Krishnamurthy", accountType: "Liability" },
  { subGroup: "Director / Related Party Loans", name: "Loan from Managing Director", accountType: "Liability" },
  { subGroup: "Director / Related Party Loans", name: "Loan from Related Party - Agro Trust", accountType: "Liability" },
  { subGroup: "Director / Related Party Loans", name: "Related Party Unsecured Loan", accountType: "Liability" },

  // Discount Received
  { subGroup: "Discount Received", name: "Bulk Purchase Discount", accountType: "Income" },
  { subGroup: "Discount Received", name: "Cash Discount - Raw Materials", accountType: "Income" },
  { subGroup: "Discount Received", name: "Early Payment Discount Earned", accountType: "Income" },
  { subGroup: "Discount Received", name: "Purchase Discount from AgroChem", accountType: "Income" },
  { subGroup: "Discount Received", name: "Volume Rebate from Supplier", accountType: "Income" },

  // Dividend Income
  { subGroup: "Dividend Income", name: "Dividend from AgroCo Ltd", accountType: "Income" },
  { subGroup: "Dividend Income", name: "Dividend from Subsidiary", accountType: "Income" },
  { subGroup: "Dividend Income", name: "Equity Dividend - Associate", accountType: "Income" },
  { subGroup: "Dividend Income", name: "Mutual Fund Dividend Income", accountType: "Income" },
  { subGroup: "Dividend Income", name: "Preference Share Dividend", accountType: "Income" },

  // Drawings
  { subGroup: "Drawings", name: "Director Drawings - Advance Tax", accountType: "Liability" },
  { subGroup: "Drawings", name: "Director Drawings - FY 2026", accountType: "Liability" },
  { subGroup: "Drawings", name: "Partner Drawings - Q1 FY26", accountType: "Liability" },
  { subGroup: "Drawings", name: "Partner Drawings Account", accountType: "Liability" },
  { subGroup: "Drawings", name: "Promoter Personal Withdrawals", accountType: "Liability" },

  // Duties & Taxes Payable
  { subGroup: "Duties & Taxes Payable", name: "CGST Payable", accountType: "Liability" },
  { subGroup: "Duties & Taxes Payable", name: "CGST Receivable", accountType: "Liability" },
  { subGroup: "Duties & Taxes Payable", name: "Custom Duty Payable", accountType: "Liability" },
  { subGroup: "Duties & Taxes Payable", name: "IGST Payable", accountType: "Liability" },
  { subGroup: "Duties & Taxes Payable", name: "IGST Receivable", accountType: "Liability" },
  { subGroup: "Duties & Taxes Payable", name: "Income Tax Payable - Advance", accountType: "Liability" },
  { subGroup: "Duties & Taxes Payable", name: "Professional Tax Payable", accountType: "Liability" },
  { subGroup: "Duties & Taxes Payable", name: "SGST Payable", accountType: "Liability" },
  { subGroup: "Duties & Taxes Payable", name: "SGST Receivable", accountType: "Liability" },
  { subGroup: "Duties & Taxes Payable", name: "State Cess Payable", accountType: "Liability" },

  // Electricity
  { subGroup: "Electricity", name: "Electricity Charges - Branch", accountType: "Expense" },
  { subGroup: "Electricity", name: "Electricity Charges - HO", accountType: "Expense" },
  { subGroup: "Electricity", name: "Electricity Charges - Warehouse", accountType: "Expense" },
  { subGroup: "Electricity", name: "Generator Diesel Charges", accountType: "Expense" },
  { subGroup: "Electricity", name: "Street Light & Common Area Charges", accountType: "Expense" },

  // Expenses Payable
  { subGroup: "Expenses Payable", name: "Audit Fees Payable", accountType: "Liability" },
  { subGroup: "Expenses Payable", name: "Electricity Charges Payable", accountType: "Liability" },
  { subGroup: "Expenses Payable", name: "Professional Fees Payable", accountType: "Liability" },
  { subGroup: "Expenses Payable", name: "Rent Payable - Branch", accountType: "Liability" },
  { subGroup: "Expenses Payable", name: "Supplier Expenses Payable", accountType: "Liability" },

  // Foreign Exchange Gain
  { subGroup: "Foreign Exchange Gain", name: "Currency Translation Gain", accountType: "Income" },
  { subGroup: "Foreign Exchange Gain", name: "Export Realisation Gain", accountType: "Income" },
  { subGroup: "Foreign Exchange Gain", name: "Forex Gain - Import Transactions", accountType: "Income" },
  { subGroup: "Foreign Exchange Gain", name: "Forex Revaluation Gain", accountType: "Income" },
  { subGroup: "Foreign Exchange Gain", name: "Forward Contract Gain", accountType: "Income" },

  // Foreign Exchange Loss
  { subGroup: "Foreign Exchange Loss", name: "Currency Translation Loss", accountType: "Expense" },
  { subGroup: "Foreign Exchange Loss", name: "Export Realisation Loss", accountType: "Expense" },
  { subGroup: "Foreign Exchange Loss", name: "Forex Loss - Import Payments", accountType: "Expense" },
  { subGroup: "Foreign Exchange Loss", name: "Forex Revaluation Loss", accountType: "Expense" },
  { subGroup: "Foreign Exchange Loss", name: "Forward Contract Loss", accountType: "Expense" },

  // Freight Inward
  { subGroup: "Freight Inward", name: "Freight from Supplier - Seeds", accountType: "Expense" },
  { subGroup: "Freight Inward", name: "Octroi & Entry Tax", accountType: "Expense" },
  { subGroup: "Freight Inward", name: "Port Handling - Imports", accountType: "Expense" },
  { subGroup: "Freight Inward", name: "Rail Freight - Bulk Fertilizer", accountType: "Expense" },
  { subGroup: "Freight Inward", name: "Transport - Fertilizer Inward", accountType: "Expense" },

  // Freight Outward
  { subGroup: "Freight Outward", name: "Courier Charges - Dispatch", accountType: "Expense" },
  { subGroup: "Freight Outward", name: "Delivery Freight - Pune Zone", accountType: "Expense" },
  { subGroup: "Freight Outward", name: "Export Freight Outward", accountType: "Expense" },
  { subGroup: "Freight Outward", name: "Last Mile Delivery Expense", accountType: "Expense" },
  { subGroup: "Freight Outward", name: "Transport - Distributor Deliveries", accountType: "Expense" },

  // Furniture & Fixtures
  { subGroup: "Furniture & Fixtures", name: "Branch Office Fixtures", accountType: "Asset" },
  { subGroup: "Furniture & Fixtures", name: "Conference Room Furniture", accountType: "Asset" },
  { subGroup: "Furniture & Fixtures", name: "Office Furniture - HO", accountType: "Asset" },
  { subGroup: "Furniture & Fixtures", name: "Reception Counter & Fittings", accountType: "Asset" },
  { subGroup: "Furniture & Fixtures", name: "Warehouse Racking & Shelving", accountType: "Asset" },

  // GST Late Fees / Penalty
  { subGroup: "GST Late Fees / Penalty", name: "E-Way Bill Penalty", accountType: "Expense" },
  { subGroup: "GST Late Fees / Penalty", name: "GST Demand Notice Payment", accountType: "Expense" },
  { subGroup: "GST Late Fees / Penalty", name: "GST Penalty & Interest", accountType: "Expense" },
  { subGroup: "GST Late Fees / Penalty", name: "GST Show Cause Notice Settlement", accountType: "Expense" },
  { subGroup: "GST Late Fees / Penalty", name: "GSTR-3B Late Filing Charges", accountType: "Expense" },

  // GST Payable
  { subGroup: "GST Payable", name: "GST Interest & Penalty Payable", accountType: "Liability" },
  { subGroup: "GST Payable", name: "GST Payable Control Account", accountType: "Liability" },
  { subGroup: "GST Payable", name: "Output CGST Payable", accountType: "Liability" },
  { subGroup: "GST Payable", name: "Output IGST Payable", accountType: "Liability" },
  { subGroup: "GST Payable", name: "Output SGST Payable", accountType: "Liability" },

  // Housekeeping
  { subGroup: "Housekeeping", name: "Cleaning Supplies Expense", accountType: "Expense" },
  { subGroup: "Housekeeping", name: "Housekeeping Agency Charges", accountType: "Expense" },
  { subGroup: "Housekeeping", name: "Housekeeping Charges", accountType: "Expense" },
  { subGroup: "Housekeeping", name: "Pest Control Expense", accountType: "Expense" },
  { subGroup: "Housekeeping", name: "Sanitation & Waste Disposal", accountType: "Expense" },

  // Incentives
  { subGroup: "Incentives", name: "Collection Incentive", accountType: "Expense" },
  { subGroup: "Incentives", name: "Dealer Scheme Incentive Expense", accountType: "Expense" },
  { subGroup: "Incentives", name: "Sales Commission Expense", accountType: "Expense" },
  { subGroup: "Incentives", name: "Target Achievement Incentive", accountType: "Expense" },
  { subGroup: "Incentives", name: "Territory Growth Incentive", accountType: "Expense" },

  // Intangible Assets
  { subGroup: "Intangible Assets", name: "Brand & Trademark Value", accountType: "Asset" },
  { subGroup: "Intangible Assets", name: "Domain & Digital Assets", accountType: "Asset" },
  { subGroup: "Intangible Assets", name: "ERP Software License", accountType: "Asset" },
  { subGroup: "Intangible Assets", name: "Goodwill - Business Acquisition", accountType: "Asset" },
  { subGroup: "Intangible Assets", name: "Patent & Formulation Rights", accountType: "Asset" },

  // Interest Expense
  { subGroup: "Interest Expense", name: "Bank Overdraft Interest", accountType: "Expense" },
  { subGroup: "Interest Expense", name: "Interest on CC Limit", accountType: "Expense" },
  { subGroup: "Interest Expense", name: "Interest on Term Loan - HDFC", accountType: "Expense" },
  { subGroup: "Interest Expense", name: "Interest on Vendor Finance", accountType: "Expense" },
  { subGroup: "Interest Expense", name: "Interest on Working Capital Loan", accountType: "Expense" },

  // Interest Income
  { subGroup: "Interest Income", name: "Bank Interest - HDFC Current Account", accountType: "Income" },
  { subGroup: "Interest Income", name: "FD Interest Income", accountType: "Income" },
  { subGroup: "Interest Income", name: "Interest on Inter-Corporate Deposits", accountType: "Income" },
  { subGroup: "Interest Income", name: "Interest on Security Deposits", accountType: "Income" },
  { subGroup: "Interest Income", name: "Interest on Staff Advances", accountType: "Income" },

  // Inventory / Stock-in-Hand
  { subGroup: "Inventory / Stock-in-Hand", name: "DAP Fertilizer Stock", accountType: "Asset" },
  { subGroup: "Inventory / Stock-in-Hand", name: "NPK Fertilizer Stock", accountType: "Asset" },
  { subGroup: "Inventory / Stock-in-Hand", name: "Pesticide Inventory", accountType: "Asset" },
  { subGroup: "Inventory / Stock-in-Hand", name: "Seed Inventory", accountType: "Asset" },
  { subGroup: "Inventory / Stock-in-Hand", name: "Urea 50kg Stock", accountType: "Asset" },

  // Job Work Charges
  { subGroup: "Job Work Charges", name: "Agro Processing Job Work", accountType: "Expense" },
  { subGroup: "Job Work Charges", name: "Bagging & Labelling Job Work", accountType: "Expense" },
  { subGroup: "Job Work Charges", name: "Custom Blending Job Work", accountType: "Expense" },
  { subGroup: "Job Work Charges", name: "Seed Treatment Job Work", accountType: "Expense" },
  { subGroup: "Job Work Charges", name: "Third Party Lab Testing Charges", accountType: "Expense" },

  // Land & Building
  { subGroup: "Land & Building", name: "Branch Office Premises", accountType: "Asset" },
  { subGroup: "Land & Building", name: "Head Office Building", accountType: "Asset" },
  { subGroup: "Land & Building", name: "Open Storage Yard", accountType: "Asset" },
  { subGroup: "Land & Building", name: "Staff Quarters Building", accountType: "Asset" },
  { subGroup: "Land & Building", name: "Warehouse Land & Structure", accountType: "Asset" },

  // Legal Fees
  { subGroup: "Legal Fees", name: "Compliance Advisory Fees", accountType: "Expense" },
  { subGroup: "Legal Fees", name: "Contract Drafting & Vetting Fees", accountType: "Expense" },
  { subGroup: "Legal Fees", name: "Court Filing & Litigation Charges", accountType: "Expense" },
  { subGroup: "Legal Fees", name: "Legal Retainer Fees", accountType: "Expense" },
  { subGroup: "Legal Fees", name: "Trademark Registration Legal Fees", accountType: "Expense" },

  // Loan Processing Charges
  { subGroup: "Loan Processing Charges", name: "Credit Appraisal Charges", accountType: "Expense" },
  { subGroup: "Loan Processing Charges", name: "HDFC Loan Processing Fee", accountType: "Expense" },
  { subGroup: "Loan Processing Charges", name: "Loan Syndication Fee", accountType: "Expense" },
  { subGroup: "Loan Processing Charges", name: "Mortgage Stamping Charges", accountType: "Expense" },
  { subGroup: "Loan Processing Charges", name: "SBI Loan Documentation Charges", accountType: "Expense" },

  // Loans & Advances Given
  { subGroup: "Loans & Advances Given", name: "Advance to Contractors", accountType: "Asset" },
  { subGroup: "Loans & Advances Given", name: "Dealer Security Deposit", accountType: "Asset" },
  { subGroup: "Loans & Advances Given", name: "Security Deposit - Warehouse Landlord", accountType: "Asset" },
  { subGroup: "Loans & Advances Given", name: "Staff Advance - Sales Team", accountType: "Asset" },
  { subGroup: "Loans & Advances Given", name: "Supplier Advance - AgroChem Traders", accountType: "Asset" },

  // Long-Term Investments
  { subGroup: "Long-Term Investments", name: "Equity Shares - AgroCo Ltd", accountType: "Asset" },
  { subGroup: "Long-Term Investments", name: "Government Securities - Long Term", accountType: "Asset" },
  { subGroup: "Long-Term Investments", name: "Investment in Associate Company", accountType: "Asset" },
  { subGroup: "Long-Term Investments", name: "NABARD Infrastructure Bonds", accountType: "Asset" },
  { subGroup: "Long-Term Investments", name: "Strategic Equity Investment", accountType: "Asset" },

  // Manufacturing Expenses
  { subGroup: "Manufacturing Expenses", name: "Factory Overheads", accountType: "Expense" },
  { subGroup: "Manufacturing Expenses", name: "Fertilizer Blending Charges", accountType: "Expense" },
  { subGroup: "Manufacturing Expenses", name: "Power & Fuel - Plant", accountType: "Expense" },
  { subGroup: "Manufacturing Expenses", name: "Quality Testing Expense", accountType: "Expense" },
  { subGroup: "Manufacturing Expenses", name: "Wastage & Spoilage - Production", accountType: "Expense" },

  // Miscellaneous Expenses
  { subGroup: "Miscellaneous Expenses", name: "Bank Reconciliation Difference", accountType: "Expense" },
  { subGroup: "Miscellaneous Expenses", name: "Donation & CSR Contribution", accountType: "Expense" },
  { subGroup: "Miscellaneous Expenses", name: "Miscellaneous Administrative Expense", accountType: "Expense" },
  { subGroup: "Miscellaneous Expenses", name: "Rounding Off Differences", accountType: "Expense" },
  { subGroup: "Miscellaneous Expenses", name: "Sundry Losses & Write-offs", accountType: "Expense" },

  // Miscellaneous Income
  { subGroup: "Miscellaneous Income", name: "Bad Debt Recovery", accountType: "Income" },
  { subGroup: "Miscellaneous Income", name: "Insurance Claim Received", accountType: "Income" },
  { subGroup: "Miscellaneous Income", name: "Liquidated Damages Received", accountType: "Income" },
  { subGroup: "Miscellaneous Income", name: "Miscellaneous Refunds", accountType: "Income" },
  { subGroup: "Miscellaneous Income", name: "Sundry Receipts", accountType: "Income" },

  // NBFC Loans
  { subGroup: "NBFC Loans", name: "Bajaj Finance Equipment Loan", accountType: "Liability" },
  { subGroup: "NBFC Loans", name: "Cholamandalam Working Capital Loan", accountType: "Liability" },
  { subGroup: "NBFC Loans", name: "Mahindra Finance Term Loan", accountType: "Liability" },
  { subGroup: "NBFC Loans", name: "Shriram Transport Finance Loan", accountType: "Liability" },
  { subGroup: "NBFC Loans", name: "Tata Capital Business Loan", accountType: "Liability" },

  // Office Equipment
  { subGroup: "Office Equipment", name: "Air Conditioning Units", accountType: "Asset" },
  { subGroup: "Office Equipment", name: "Fire Safety Equipment", accountType: "Asset" },
  { subGroup: "Office Equipment", name: "Office Printers & Scanners", accountType: "Asset" },
  { subGroup: "Office Equipment", name: "Security & Surveillance Equipment", accountType: "Asset" },
  { subGroup: "Office Equipment", name: "Water Purifier & Dispenser", accountType: "Asset" },

  // Office Expenses
  { subGroup: "Office Expenses", name: "Courier & Postage Expense", accountType: "Expense" },
  { subGroup: "Office Expenses", name: "Miscellaneous Office Expense", accountType: "Expense" },
  { subGroup: "Office Expenses", name: "Newspaper & Periodicals", accountType: "Expense" },
  { subGroup: "Office Expenses", name: "Office Supplies & Materials", accountType: "Expense" },
  { subGroup: "Office Expenses", name: "Pantry & Cafeteria Expense", accountType: "Expense" },

  // Other Current Assets
  { subGroup: "Other Current Assets", name: "GST Input Credit (CGST)", accountType: "Asset" },
  { subGroup: "Other Current Assets", name: "GST Input Credit (IGST)", accountType: "Asset" },
  { subGroup: "Other Current Assets", name: "GST Input Credit (SGST)", accountType: "Asset" },
  { subGroup: "Other Current Assets", name: "Input Tax Credit Receivable", accountType: "Asset" },
  { subGroup: "Other Current Assets", name: "TDS Receivable", accountType: "Asset" },

  // Other Current Liabilities
  { subGroup: "Other Current Liabilities", name: "Customer Refund Liability", accountType: "Liability" },
  { subGroup: "Other Current Liabilities", name: "Refundable Security Deposits Held", accountType: "Liability" },
  { subGroup: "Other Current Liabilities", name: "Sundry Payables - Others", accountType: "Liability" },
  { subGroup: "Other Current Liabilities", name: "Unclaimed Dividends", accountType: "Liability" },
  { subGroup: "Other Current Liabilities", name: "Unearned Revenue", accountType: "Liability" },

  // Other Government Fees
  { subGroup: "Other Government Fees", name: "Factory License Renewal Fees", accountType: "Expense" },
  { subGroup: "Other Government Fees", name: "FSSAI Registration Charges", accountType: "Expense" },
  { subGroup: "Other Government Fees", name: "Pollution Control Board Fees", accountType: "Expense" },
  { subGroup: "Other Government Fees", name: "Shop & Establishment License Fees", accountType: "Expense" },
  { subGroup: "Other Government Fees", name: "Weights & Measures License Fees", accountType: "Expense" },

  // Other Investments
  { subGroup: "Other Investments", name: "Infrastructure Investment Trust Units", accountType: "Asset" },
  { subGroup: "Other Investments", name: "Investment in Subsidiary", accountType: "Asset" },
  { subGroup: "Other Investments", name: "Post Office Savings Deposit", accountType: "Asset" },
  { subGroup: "Other Investments", name: "Rural Electrification Bonds", accountType: "Asset" },
  { subGroup: "Other Investments", name: "Security Deposit - Long Term", accountType: "Asset" },

  // Other Operating Income
  { subGroup: "Other Operating Income", name: "By-Product Revenue", accountType: "Income" },
  { subGroup: "Other Operating Income", name: "Export Incentive Income", accountType: "Income" },
  { subGroup: "Other Operating Income", name: "Handling Charges Recovered", accountType: "Income" },
  { subGroup: "Other Operating Income", name: "Packaging Material Recovery", accountType: "Income" },
  { subGroup: "Other Operating Income", name: "Scrap Sales Income", accountType: "Income" },

  // Other Provisions
  { subGroup: "Other Provisions", name: "Provision for Bad & Doubtful Debts", accountType: "Liability" },
  { subGroup: "Other Provisions", name: "Provision for Legal Claims", accountType: "Liability" },
  { subGroup: "Other Provisions", name: "Provision for Restructuring", accountType: "Liability" },
  { subGroup: "Other Provisions", name: "Provision for Returns & Disputes", accountType: "Liability" },
  { subGroup: "Other Provisions", name: "Provision for Warranty Claims", accountType: "Liability" },

  // Packing Expenses
  { subGroup: "Packing Expenses", name: "Carton Box Expense", accountType: "Expense" },
  { subGroup: "Packing Expenses", name: "HDPE Bag Purchase", accountType: "Expense" },
  { subGroup: "Packing Expenses", name: "Label & Sticker Printing", accountType: "Expense" },
  { subGroup: "Packing Expenses", name: "Pallet & Strapping Material", accountType: "Expense" },
  { subGroup: "Packing Expenses", name: "Stretch Film & Wrapping Material", accountType: "Expense" },

  // PF / ESIC Payable
  { subGroup: "PF / ESIC Payable", name: "EDLI Contribution Payable", accountType: "Liability" },
  { subGroup: "PF / ESIC Payable", name: "ESIC Payable", accountType: "Liability" },
  { subGroup: "PF / ESIC Payable", name: "PF Admin Charges Payable", accountType: "Liability" },
  { subGroup: "PF / ESIC Payable", name: "PF Payable - Employee Contribution", accountType: "Liability" },
  { subGroup: "PF / ESIC Payable", name: "PF Payable - Employer Contribution", accountType: "Liability" },

  // Plant & Machinery
  { subGroup: "Plant & Machinery", name: "Bagging & Packaging Machine", accountType: "Asset" },
  { subGroup: "Plant & Machinery", name: "Conveyor & Material Handling System", accountType: "Asset" },
  { subGroup: "Plant & Machinery", name: "Fertilizer Blending Machine", accountType: "Asset" },
  { subGroup: "Plant & Machinery", name: "Seed Processing Unit", accountType: "Asset" },
  { subGroup: "Plant & Machinery", name: "Water Treatment Plant", accountType: "Asset" },

  // Prepaid Expenses
  { subGroup: "Prepaid Expenses", name: "Prepaid AMC - IT Equipment", accountType: "Asset" },
  { subGroup: "Prepaid Expenses", name: "Prepaid Annual Maintenance Contract", accountType: "Asset" },
  { subGroup: "Prepaid Expenses", name: "Prepaid Annual Software Subscription", accountType: "Asset" },
  { subGroup: "Prepaid Expenses", name: "Prepaid Insurance - Plant & Machinery", accountType: "Asset" },
  { subGroup: "Prepaid Expenses", name: "Prepaid Office Rent", accountType: "Asset" },

  // Printing & Stationery
  { subGroup: "Printing & Stationery", name: "Annual Report Printing", accountType: "Expense" },
  { subGroup: "Printing & Stationery", name: "Invoice & Bill Printing", accountType: "Expense" },
  { subGroup: "Printing & Stationery", name: "Office Stationery", accountType: "Expense" },
  { subGroup: "Printing & Stationery", name: "Printing & Stationery", accountType: "Expense" },
  { subGroup: "Printing & Stationery", name: "Product Brochure & Catalogue Printing", accountType: "Expense" },

  // Professional Fees
  { subGroup: "Professional Fees", name: "CA Fees", accountType: "Expense" },
  { subGroup: "Professional Fees", name: "CS Annual Retainer Fees", accountType: "Expense" },
  { subGroup: "Professional Fees", name: "GST Consultant Fees", accountType: "Expense" },
  { subGroup: "Professional Fees", name: "Tax Consultant Fees", accountType: "Expense" },
  { subGroup: "Professional Fees", name: "Valuation Expert Fees", accountType: "Expense" },

  // Professional Fees Income
  { subGroup: "Professional Fees Income", name: "Agri Consultancy Fees Received", accountType: "Income" },
  { subGroup: "Professional Fees Income", name: "Crop Advisory Retainer Income", accountType: "Income" },
  { subGroup: "Professional Fees Income", name: "Knowledge Transfer Fee Income", accountType: "Income" },
  { subGroup: "Professional Fees Income", name: "Project Advisory Income", accountType: "Income" },
  { subGroup: "Professional Fees Income", name: "Technical Audit Fee Income", accountType: "Income" },

  // Profit on Sale of Asset
  { subGroup: "Profit on Sale of Asset", name: "Profit on Sale of Furniture", accountType: "Income" },
  { subGroup: "Profit on Sale of Asset", name: "Profit on Sale of IT Assets", accountType: "Income" },
  { subGroup: "Profit on Sale of Asset", name: "Profit on Sale of Old Vehicle", accountType: "Income" },
  { subGroup: "Profit on Sale of Asset", name: "Profit on Sale of Plant Equipment", accountType: "Income" },
  { subGroup: "Profit on Sale of Asset", name: "Profit on Sale of Scrap Machinery", accountType: "Income" },

  // Proprietor / Partner / Shareholder Capital
  { subGroup: "Proprietor / Partner / Shareholder Capital", name: "Equity Share Capital", accountType: "Liability" },
  { subGroup: "Proprietor / Partner / Shareholder Capital", name: "Partner Capital Account", accountType: "Liability" },
  { subGroup: "Proprietor / Partner / Shareholder Capital", name: "Preference Share Capital", accountType: "Liability" },
  { subGroup: "Proprietor / Partner / Shareholder Capital", name: "Promoter Capital - Krishnamurthy Agro", accountType: "Liability" },
  { subGroup: "Proprietor / Partner / Shareholder Capital", name: "Share Application Money", accountType: "Liability" },

  // Provision for Audit Fees
  { subGroup: "Provision for Audit Fees", name: "Provision for GST Audit", accountType: "Liability" },
  { subGroup: "Provision for Audit Fees", name: "Provision for Internal Audit", accountType: "Liability" },
  { subGroup: "Provision for Audit Fees", name: "Provision for Limited Review", accountType: "Liability" },
  { subGroup: "Provision for Audit Fees", name: "Provision for Statutory Audit", accountType: "Liability" },
  { subGroup: "Provision for Audit Fees", name: "Provision for Tax Audit Fees", accountType: "Liability" },

  // Provision for Expenses
  { subGroup: "Provision for Expenses", name: "Provision for Annual Bonus", accountType: "Liability" },
  { subGroup: "Provision for Expenses", name: "Provision for Gratuity", accountType: "Liability" },
  { subGroup: "Provision for Expenses", name: "Provision for Leave Encashment", accountType: "Liability" },
  { subGroup: "Provision for Expenses", name: "Provision for Overtime", accountType: "Liability" },
  { subGroup: "Provision for Expenses", name: "Provision for Warranty", accountType: "Liability" },

  // Provision for Tax
  { subGroup: "Provision for Tax", name: "Provision for Deferred Tax Liability", accountType: "Liability" },
  { subGroup: "Provision for Tax", name: "Provision for GST Liability", accountType: "Liability" },
  { subGroup: "Provision for Tax", name: "Provision for Income Tax FY26", accountType: "Liability" },
  { subGroup: "Provision for Tax", name: "Provision for MAT Credit", accountType: "Liability" },
  { subGroup: "Provision for Tax", name: "Provision for Wealth Tax", accountType: "Liability" },

  // Purchases
  { subGroup: "Purchases", name: "Fertilizer Purchase", accountType: "Expense" },
  { subGroup: "Purchases", name: "Packaging Material Purchase", accountType: "Expense" },
  { subGroup: "Purchases", name: "Pesticide Purchase", accountType: "Expense" },
  { subGroup: "Purchases", name: "Raw Material Purchase", accountType: "Expense" },
  { subGroup: "Purchases", name: "Seed Purchase", accountType: "Expense" },

  // Recruitment Expenses
  { subGroup: "Recruitment Expenses", name: "Background Verification Charges", accountType: "Expense" },
  { subGroup: "Recruitment Expenses", name: "Campus Hiring Expense", accountType: "Expense" },
  { subGroup: "Recruitment Expenses", name: "Job Portal Subscription Fee", accountType: "Expense" },
  { subGroup: "Recruitment Expenses", name: "Onboarding & Joining Expense", accountType: "Expense" },
  { subGroup: "Recruitment Expenses", name: "Recruitment Agency Fee", accountType: "Expense" },

  // Rent
  { subGroup: "Rent", name: "Branch Office Rent", accountType: "Expense" },
  { subGroup: "Rent", name: "Godown Rental", accountType: "Expense" },
  { subGroup: "Rent", name: "Office Rent", accountType: "Expense" },
  { subGroup: "Rent", name: "Staff Quarter Rent", accountType: "Expense" },
  { subGroup: "Rent", name: "Warehouse Rent", accountType: "Expense" },

  // Rent Income
  { subGroup: "Rent Income", name: "Equipment Hire Charges Received", accountType: "Income" },
  { subGroup: "Rent Income", name: "Godown Sub-lease Income", accountType: "Income" },
  { subGroup: "Rent Income", name: "Office Space Rental Income", accountType: "Income" },
  { subGroup: "Rent Income", name: "Parking Space Rental Income", accountType: "Income" },
  { subGroup: "Rent Income", name: "Warehouse Rental Income", accountType: "Income" },

  // Repairs & Maintenance
  { subGroup: "Repairs & Maintenance", name: "Electrical Repairs & AMC", accountType: "Expense" },
  { subGroup: "Repairs & Maintenance", name: "IT & Computer Maintenance", accountType: "Expense" },
  { subGroup: "Repairs & Maintenance", name: "Office Premises Maintenance", accountType: "Expense" },
  { subGroup: "Repairs & Maintenance", name: "Plant & Equipment Servicing", accountType: "Expense" },
  { subGroup: "Repairs & Maintenance", name: "Vehicle Maintenance & Service", accountType: "Expense" },

  // Reserves & Surplus
  { subGroup: "Reserves & Surplus", name: "Capital Reserve", accountType: "Liability" },
  { subGroup: "Reserves & Surplus", name: "General Reserve", accountType: "Liability" },
  { subGroup: "Reserves & Surplus", name: "Investment Fluctuation Reserve", accountType: "Liability" },
  { subGroup: "Reserves & Surplus", name: "Revaluation Reserve", accountType: "Liability" },
  { subGroup: "Reserves & Surplus", name: "Securities Premium Reserve", accountType: "Liability" },

  // Retained Earnings
  { subGroup: "Retained Earnings", name: "Accumulated Surplus - Prior Years", accountType: "Liability" },
  { subGroup: "Retained Earnings", name: "Current Year Retained Profit", accountType: "Liability" },
  { subGroup: "Retained Earnings", name: "Dividend Equalisation Reserve", accountType: "Liability" },
  { subGroup: "Retained Earnings", name: "Prior Year Profit Brought Forward", accountType: "Liability" },
  { subGroup: "Retained Earnings", name: "Profit & Loss Account", accountType: "Liability" },

  // ROC Fees
  { subGroup: "ROC Fees", name: "Annual Return Filing Fees", accountType: "Expense" },
  { subGroup: "ROC Fees", name: "Charge Registration Fees", accountType: "Expense" },
  { subGroup: "ROC Fees", name: "Director KYC Filing Fees", accountType: "Expense" },
  { subGroup: "ROC Fees", name: "ROC Annual Filing Fees", accountType: "Expense" },
  { subGroup: "ROC Fees", name: "Trade License Fees", accountType: "Expense" },

  // Salaries & Wages
  { subGroup: "Salaries & Wages", name: "Contract Labour Expense", accountType: "Expense" },
  { subGroup: "Salaries & Wages", name: "Field Staff Salary Expense", accountType: "Expense" },
  { subGroup: "Salaries & Wages", name: "HO Salary Expense", accountType: "Expense" },
  { subGroup: "Salaries & Wages", name: "Sales Team Salary Expense", accountType: "Expense" },
  { subGroup: "Salaries & Wages", name: "Warehouse Staff Salary Expense", accountType: "Expense" },

  // Salary Payable
  { subGroup: "Salary Payable", name: "Incentive & Bonus Payable", accountType: "Liability" },
  { subGroup: "Salary Payable", name: "Leave Encashment Payable", accountType: "Liability" },
  { subGroup: "Salary Payable", name: "Salary Payable - HO Staff", accountType: "Liability" },
  { subGroup: "Salary Payable", name: "Salary Payable - Sales Team", accountType: "Liability" },
  { subGroup: "Salary Payable", name: "Salary Payable - Warehouse Team", accountType: "Liability" },

  // Sales
  { subGroup: "Sales", name: "Bio Product Sales", accountType: "Income" },
  { subGroup: "Sales", name: "Fertilizer Sales", accountType: "Income" },
  { subGroup: "Sales", name: "Micronutrient Sales", accountType: "Income" },
  { subGroup: "Sales", name: "Pesticide Sales", accountType: "Income" },
  { subGroup: "Sales", name: "Seed Sales", accountType: "Income" },

  // Sales Promotion
  { subGroup: "Sales Promotion", name: "Dealer Meet Expense", accountType: "Expense" },
  { subGroup: "Sales Promotion", name: "Farmer Field Trial Expense", accountType: "Expense" },
  { subGroup: "Sales Promotion", name: "Kisan Mela Participation", accountType: "Expense" },
  { subGroup: "Sales Promotion", name: "Product Demo & Sample Expense", accountType: "Expense" },
  { subGroup: "Sales Promotion", name: "Scheme Gift & Premium Expense", accountType: "Expense" },

  // Secured Loans
  { subGroup: "Secured Loans", name: "HDFC Term Loan - Plant & Machinery", accountType: "Liability" },
  { subGroup: "Secured Loans", name: "ICICI Equipment Finance Loan", accountType: "Liability" },
  { subGroup: "Secured Loans", name: "Mortgage Loan - Head Office", accountType: "Liability" },
  { subGroup: "Secured Loans", name: "SBI Secured Loan - Warehouse", accountType: "Liability" },
  { subGroup: "Secured Loans", name: "Vehicle Loan - Secured", accountType: "Liability" },

  // Service Revenue
  { subGroup: "Service Revenue", name: "Agronomy Consulting Revenue", accountType: "Income" },
  { subGroup: "Service Revenue", name: "Field Service Revenue", accountType: "Income" },
  { subGroup: "Service Revenue", name: "Soil Testing Service Revenue", accountType: "Income" },
  { subGroup: "Service Revenue", name: "Technical Advisory Revenue", accountType: "Income" },
  { subGroup: "Service Revenue", name: "Training Program Revenue", accountType: "Income" },

  // Short-Term Investments
  { subGroup: "Short-Term Investments", name: "Commercial Paper Investment", accountType: "Asset" },
  { subGroup: "Short-Term Investments", name: "Fixed Deposit - HDFC Bank", accountType: "Asset" },
  { subGroup: "Short-Term Investments", name: "Liquid Mutual Fund - HDFC AMC", accountType: "Asset" },
  { subGroup: "Short-Term Investments", name: "Short-Term Corporate Deposits", accountType: "Asset" },
  { subGroup: "Short-Term Investments", name: "Treasury Bills", accountType: "Asset" },

  // Staff Welfare
  { subGroup: "Staff Welfare", name: "Canteen & Refreshment Expense", accountType: "Expense" },
  { subGroup: "Staff Welfare", name: "Employee Insurance Premium", accountType: "Expense" },
  { subGroup: "Staff Welfare", name: "Employee Medical Expense", accountType: "Expense" },
  { subGroup: "Staff Welfare", name: "Staff Training & Development", accountType: "Expense" },
  { subGroup: "Staff Welfare", name: "Team Building & Outing Expense", accountType: "Expense" },

  // TDS Late Fees / Penalty
  { subGroup: "TDS Late Fees / Penalty", name: "TDS Correction Statement Charges", accountType: "Expense" },
  { subGroup: "TDS Late Fees / Penalty", name: "TDS Demand Settlement", accountType: "Expense" },
  { subGroup: "TDS Late Fees / Penalty", name: "TDS Late Deposit Charges", accountType: "Expense" },
  { subGroup: "TDS Late Fees / Penalty", name: "TDS Penalty & Interest", accountType: "Expense" },
  { subGroup: "TDS Late Fees / Penalty", name: "TDS Return Filing Penalty", accountType: "Expense" },

  // TDS Payable
  { subGroup: "TDS Payable", name: "TDS Payable - Sec 192 (Salary)", accountType: "Liability" },
  { subGroup: "TDS Payable", name: "TDS Payable - Sec 194C (Contractors)", accountType: "Liability" },
  { subGroup: "TDS Payable", name: "TDS Payable - Sec 194H (Commission)", accountType: "Liability" },
  { subGroup: "TDS Payable", name: "TDS Payable - Sec 194J (Professional)", accountType: "Liability" },
  { subGroup: "TDS Payable", name: "TDS Payable - Sec 194Q (Purchase)", accountType: "Liability" },

  // Telephone & Internet
  { subGroup: "Telephone & Internet", name: "Internet Broadband Expense", accountType: "Expense" },
  { subGroup: "Telephone & Internet", name: "Internet Charges", accountType: "Expense" },
  { subGroup: "Telephone & Internet", name: "Mobile Reimbursement - Sales Team", accountType: "Expense" },
  { subGroup: "Telephone & Internet", name: "Office Landline Charges", accountType: "Expense" },
  { subGroup: "Telephone & Internet", name: "Video Conferencing Subscription", accountType: "Expense" },

  // Unsecured Loans
  { subGroup: "Unsecured Loans", name: "Inter-Company Unsecured Loan", accountType: "Liability" },
  { subGroup: "Unsecured Loans", name: "Promoter Unsecured Advance", accountType: "Liability" },
  { subGroup: "Unsecured Loans", name: "Short-Term Bridge Loan", accountType: "Liability" },
  { subGroup: "Unsecured Loans", name: "Unsecured Loan from Promoter", accountType: "Liability" },
  { subGroup: "Unsecured Loans", name: "Working Capital Unsecured Loan", accountType: "Liability" },

  // Vehicles
  { subGroup: "Vehicles", name: "Company Car MH-12-XY-5678", accountType: "Asset" },
  { subGroup: "Vehicles", name: "Delivery Van MH-12-AB-1234", accountType: "Asset" },
  { subGroup: "Vehicles", name: "Field Staff Motorcycle Fleet", accountType: "Asset" },
  { subGroup: "Vehicles", name: "Tempo for Local Deliveries", accountType: "Asset" },
  { subGroup: "Vehicles", name: "Tractor for Warehouse Yard", accountType: "Asset" },
];
