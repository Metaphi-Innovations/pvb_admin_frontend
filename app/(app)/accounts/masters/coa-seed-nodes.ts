import type { AccountType, ChartOfAccount, CoaNodeLevel, CoaSpecializedGroupType, ErpUsageModule } from "../data";
import {
  DUTIES_STATUTORY_LEDGERS,
  GST_INPUT_STATUTORY_LEDGERS,
  GST_OUTPUT_STATUTORY_LEDGERS,
  type CoaStatutoryLedgerSeed,
} from "./chart-of-accounts/coa-statutory-ledgers";

type CoaPartial = Omit<
  ChartOfAccount,
  "alias" | "openingBalance" | "balanceType" | "gstApplicable" | "tdsApplicable" | "costCenterApplicable" | "bankAccountFlag"
> &
  Partial<
    Pick<
      ChartOfAccount,
      "alias" | "openingBalance" | "balanceType" | "gstApplicable" | "tdsApplicable" | "costCenterApplicable" | "bankAccountFlag"
    >
  >;

export function buildCoaNode(partial: CoaPartial): ChartOfAccount {
  return {
    alias: "",
    openingBalance: 0,
    balanceType: "Debit",
    gstApplicable: false,
    tdsApplicable: false,
    costCenterApplicable: false,
    bankAccountFlag: false,
    ...partial,
  };
}

interface CoaTreeLeaf {
  name: string;
  code: string;
  specializedGroupType?: CoaSpecializedGroupType;
  children?: CoaTreeLeaf[];
  ledgers?: CoaStatutoryLedgerSeed[];
}

interface CoaTreeBranch {
  name: string;
  code: string;
  specializedGroupType?: CoaSpecializedGroupType;
  children?: CoaTreeLeaf[];
  ledgers?: CoaStatutoryLedgerSeed[];
}

interface CoaTreeGroup {
  name: string;
  code: string;
  branches: CoaTreeBranch[];
}

const PRIMARY_HEADS: { id: number; code: string; name: string; type: AccountType }[] = [
  { id: 1, code: "1000", name: "Assets", type: "Asset" },
  { id: 2, code: "2000", name: "Liabilities", type: "Liability" },
  { id: 3, code: "3000", name: "Income", type: "Income" },
  { id: 4, code: "4000", name: "Expenses", type: "Expense" },
];

const ASSETS_GROUPS: CoaTreeGroup[] = [
  {
    name: "Fixed Assets",
    code: "1100",
    branches: [
      { name: "Land & Building", code: "1110", specializedGroupType: "warehouse" },
      { name: "Plant & Machinery", code: "1111" },
      { name: "Furniture & Fixtures", code: "1112" },
      { name: "Office Equipment", code: "1113" },
      { name: "Computers & IT Equipment", code: "1114" },
      { name: "Vehicles", code: "1115" },
      { name: "Intangible Assets", code: "1116" },
    ],
  },
  {
    name: "Current Assets",
    code: "1200",
    branches: [
      { name: "Cash-in-Hand", code: "1210", specializedGroupType: "cash_in_hand" },
      { name: "Bank Accounts", code: "1211", specializedGroupType: "bank_accounts" },
      { name: "Trade Receivables / Sundry Debtors", code: "1212", specializedGroupType: "sundry_debtors" },
      { name: "Inventory / Stock-in-Hand", code: "1213", specializedGroupType: "inventory" },
      { name: "Loans & Advances Given", code: "1214" },
      { name: "Deposits", code: "1215" },
      { name: "Prepaid Expenses", code: "1216" },
      { name: "Accrued Income", code: "1217" },
      { name: "Other Current Assets", code: "1218" },
      { name: "GST Input Credit", code: "1219", specializedGroupType: "gst_input", ledgers: GST_INPUT_STATUTORY_LEDGERS },
      { name: "TDS Receivable", code: "1220", specializedGroupType: "tds_receivable" },
    ],
  },
  {
    name: "Investments",
    code: "1300",
    branches: [
      { name: "Short-Term Investments", code: "1310" },
      { name: "Long-Term Investments", code: "1311" },
      { name: "Other Investments", code: "1312" },
    ],
  },
];

const LIABILITIES_GROUPS: CoaTreeGroup[] = [
  {
    name: "Capital Account",
    code: "2100",
    branches: [
      { name: "Proprietor / Partner / Shareholder Capital", code: "2110" },
      { name: "Drawings", code: "2111" },
      { name: "Reserves & Surplus", code: "2112" },
      { name: "Retained Earnings", code: "2113" },
    ],
  },
  {
    name: "Loans / Borrowings",
    code: "2200",
    branches: [
      { name: "Secured Loans", code: "2210" },
      { name: "Unsecured Loans", code: "2211" },
      { name: "Bank Loans", code: "2212" },
      { name: "NBFC Loans", code: "2213" },
      { name: "Director / Related Party Loans", code: "2214" },
    ],
  },
  {
    name: "Current Liabilities",
    code: "2300",
    branches: [
      { name: "Trade Payables / Sundry Creditors", code: "2310", specializedGroupType: "sundry_creditors" },
      {
        name: "Duties & Taxes Payable",
        code: "2311",
        children: [
          { name: "GST Output", code: "23111", specializedGroupType: "gst_output", ledgers: GST_OUTPUT_STATUTORY_LEDGERS },
          { name: "TDS Payable", code: "23112", specializedGroupType: "tds_payable" },
        ],
        ledgers: DUTIES_STATUTORY_LEDGERS,
      },
      { name: "PF / ESIC Payable", code: "2314" },
      { name: "Salary Payable", code: "2315", specializedGroupType: "employee_payable" },
      { name: "Expenses Payable", code: "2316" },
      { name: "Advance Received from Customers", code: "2317" },
      { name: "Other Current Liabilities", code: "2318" },
    ],
  },
  {
    name: "Provisions",
    code: "2400",
    branches: [
      { name: "Provision for Tax", code: "2410" },
      { name: "Provision for Audit Fees", code: "2411" },
      { name: "Provision for Expenses", code: "2412" },
      { name: "Other Provisions", code: "2413" },
    ],
  },
];

const INCOME_GROUPS: CoaTreeGroup[] = [
  {
    name: "Direct Income",
    code: "3100",
    branches: [
      { name: "Sales", code: "3110" },
      { name: "Service Revenue", code: "3111" },
      { name: "Professional Fees Income", code: "3112" },
      { name: "Commission Income", code: "3113" },
      { name: "Other Operating Income", code: "3114" },
    ],
  },
  {
    name: "Indirect Income",
    code: "3200",
    branches: [
      { name: "Interest Income", code: "3210" },
      { name: "Dividend Income", code: "3211" },
      { name: "Rent Income", code: "3212" },
      { name: "Discount Received", code: "3213" },
      { name: "Profit on Sale of Asset", code: "3214" },
      { name: "Foreign Exchange Gain", code: "3215" },
      { name: "Miscellaneous Income", code: "3216" },
    ],
  },
];

const DIRECT_EXPENSE_BRANCHES: CoaTreeLeaf[] = [
  { name: "Purchases", code: "4110" },
  { name: "Cost of Goods Sold", code: "4111" },
  { name: "Direct Labour", code: "4112" },
  { name: "Freight Inward", code: "4113" },
  { name: "Manufacturing Expenses", code: "4114" },
  { name: "Job Work Charges", code: "4115" },
];

const INDIRECT_EXPENSE_BRANCHES: CoaTreeBranch[] = [
  {
    name: "Employee Costs",
    code: "4210",
    children: [
      { name: "Salaries & Wages", code: "42101" },
      { name: "Bonus", code: "42102" },
      { name: "Incentives", code: "42103" },
      { name: "Staff Welfare", code: "42104" },
      { name: "Recruitment Expenses", code: "42105" },
    ],
  },
  {
    name: "Administrative Expenses",
    code: "4220",
    children: [
      { name: "Rent", code: "42201" },
      { name: "Electricity", code: "42202" },
      { name: "Office Expenses", code: "42203" },
      { name: "Printing & Stationery", code: "42204" },
      { name: "Telephone & Internet", code: "42205" },
      { name: "Repairs & Maintenance", code: "42206" },
      { name: "Housekeeping", code: "42207" },
    ],
  },
  {
    name: "Selling & Distribution Expenses",
    code: "4230",
    children: [
      { name: "Advertisement & Marketing", code: "42301" },
      { name: "Sales Promotion", code: "42302" },
      { name: "Commission Paid", code: "42303" },
      { name: "Freight Outward", code: "42304" },
      { name: "Packing Expenses", code: "42305" },
      { name: "Business Development Expenses", code: "42306" },
    ],
  },
  {
    name: "Finance Costs",
    code: "4240",
    children: [
      { name: "Interest Expense", code: "42401" },
      { name: "Bank Charges", code: "42402" },
      { name: "Loan Processing Charges", code: "42403" },
      { name: "Foreign Exchange Loss", code: "42404" },
    ],
  },
  {
    name: "Legal & Professional Expenses",
    code: "4250",
    children: [
      { name: "Audit Fees", code: "42501" },
      { name: "Consultancy Charges", code: "42502" },
      { name: "Legal Fees", code: "42503" },
      { name: "Accounting Charges", code: "42504" },
      { name: "Professional Fees", code: "42505" },
    ],
  },
  {
    name: "Statutory & Compliance Expenses",
    code: "4260",
    children: [
      { name: "ROC Fees", code: "42601" },
      { name: "GST Late Fees / Penalty", code: "42602" },
      { name: "TDS Late Fees / Penalty", code: "42603" },
      { name: "Other Government Fees", code: "42604" },
    ],
  },
  { name: "Depreciation & Amortisation", code: "4270" },
  { name: "Miscellaneous Expenses", code: "4280" },
];

let _nextId = 100;

function allocId(): number {
  _nextId += 1;
  return _nextId;
}

function systemNode(
  id: number,
  code: string,
  name: string,
  accountType: AccountType,
  nodeLevel: CoaNodeLevel,
  parentId: number | null,
  parentName: string,
  specializedGroupType?: CoaSpecializedGroupType,
): ChartOfAccount {
  const desc =
    nodeLevel === "primary_head"
      ? "System primary head"
      : "System standard group";
  return buildCoaNode({
    id,
    accountCode: code,
    accountName: name,
    accountType,
    nodeLevel,
    parentAccountId: parentId,
    parentAccount: parentName,
    description: desc,
    status: "active",
    usedIn: [],
    isSystem: true,
    specializedGroupType,
    createdBy: "System",
    updatedBy: "System",
  });
}

function systemLedgerNode(
  id: number,
  code: string,
  name: string,
  accountType: AccountType,
  parentId: number,
  parentName: string,
  ledger: CoaStatutoryLedgerSeed,
): ChartOfAccount {
  const usedIn: ErpUsageModule[] =
    ledger.tdsApplicable
      ? ["payments", "procurement", "journal"]
      : ledger.gstApplicable
        ? accountType === "Asset"
          ? ["procurement", "journal"]
          : ["sales", "journal"]
        : ["journal"];

  return buildCoaNode({
    id,
    accountCode: code,
    accountName: name,
    accountType,
    nodeLevel: "ledger",
    parentAccountId: parentId,
    parentAccount: parentName,
    description: "Statutory accounting ledger",
    status: "active",
    usedIn,
    isSystem: true,
    isSystemGenerated: true,
    balanceType: ledger.balanceType,
    gstApplicable: ledger.gstApplicable ?? false,
    tdsApplicable: ledger.tdsApplicable ?? false,
    createdBy: "System",
    updatedBy: "System",
  });
}

function appendStatutoryLedgers(
  nodes: ChartOfAccount[],
  ledgers: CoaStatutoryLedgerSeed[],
  parentId: number,
  parentName: string,
  accountType: AccountType,
): void {
  for (const ledger of ledgers) {
    nodes.push(
      systemLedgerNode(
        allocId(),
        ledger.code,
        ledger.name,
        accountType,
        parentId,
        parentName,
        ledger,
      ),
    );
  }
}

function buildTreeNodes(
  nodes: ChartOfAccount[],
  branches: CoaTreeLeaf[],
  parentId: number,
  parentName: string,
  accountType: AccountType,
): void {
  for (const branch of branches) {
    const branchId = allocId();
    nodes.push(
      systemNode(
        branchId,
        branch.code,
        branch.name,
        accountType,
        "account_group",
        parentId,
        parentName,
        branch.specializedGroupType,
      ),
    );
    if (branch.children?.length) {
      buildTreeNodes(nodes, branch.children, branchId, branch.name, accountType);
    }
    if (branch.ledgers?.length) {
      appendStatutoryLedgers(nodes, branch.ledgers, branchId, branch.name, accountType);
    }
  }
}

function buildFlatSubGroups(
  nodes: ChartOfAccount[],
  branches: CoaTreeLeaf[],
  parentId: number,
  parentName: string,
  accountType: AccountType,
): void {
  buildTreeNodes(nodes, branches, parentId, parentName, accountType);
}

function buildNestedBranches(
  nodes: ChartOfAccount[],
  branches: CoaTreeBranch[],
  parentId: number,
  parentName: string,
  accountType: AccountType,
): void {
  buildTreeNodes(nodes, branches, parentId, parentName, accountType);
}

function buildAccountGroups(
  nodes: ChartOfAccount[],
  groups: CoaTreeGroup[],
  primaryId: number,
  primaryName: string,
  accountType: AccountType,
): void {
  for (const group of groups) {
    const groupId = allocId();
    nodes.push(
      systemNode(groupId, group.code, group.name, accountType, "account_group", primaryId, primaryName),
    );
    buildNestedBranches(nodes, group.branches, groupId, group.name, accountType);
  }
}

function buildSystemCoaNodes(): ChartOfAccount[] {
  _nextId = 100;
  const nodes: ChartOfAccount[] = [];

  for (const head of PRIMARY_HEADS) {
    nodes.push(
      systemNode(head.id, head.code, head.name, head.type, "primary_head", null, ""),
    );
  }

  buildAccountGroups(nodes, ASSETS_GROUPS, 1, "Assets", "Asset");
  buildAccountGroups(nodes, LIABILITIES_GROUPS, 2, "Liabilities", "Liability");
  buildAccountGroups(nodes, INCOME_GROUPS, 3, "Income", "Income");

  const directExpId = allocId();
  nodes.push(systemNode(directExpId, "4100", "Direct Expenses", "Expense", "account_group", 4, "Expenses"));
  buildFlatSubGroups(nodes, DIRECT_EXPENSE_BRANCHES, directExpId, "Direct Expenses", "Expense");

  const indirectExpId = allocId();
  nodes.push(
    systemNode(indirectExpId, "4200", "Indirect Expenses", "Expense", "account_group", 4, "Expenses"),
  );
  buildNestedBranches(nodes, INDIRECT_EXPENSE_BRANCHES, indirectExpId, "Indirect Expenses", "Expense");

  return nodes;
}

/** System primary heads, account groups, and all sub-groups per CA chart */
export const SYSTEM_COA_NODES: ChartOfAccount[] = buildSystemCoaNodes();

/** Bump when CA system hierarchy changes — triggers storage reset on mismatch */
export const COA_SYSTEM_REVISION = 12;

export const EXPECTED_SYSTEM_NODE_COUNT = SYSTEM_COA_NODES.length;
