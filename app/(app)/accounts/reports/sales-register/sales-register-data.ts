import { roundMoney } from "@/lib/accounts/money-format";
import type {
  RegisterGstRate,
  RegisterInvoiceStatus,
  RegisterPartyOption,
  RegisterPaymentStatus,
  RegisterReportRow,
} from "../register-shared/register-types";

interface SalesPartySeed {
  id: number;
  name: string;
  gstin: string;
  state: string;
}

interface SalesInvoiceSeed {
  invoiceNo: string;
  date: string;
  partyId: number;
  taxable: number;
  gstRate: RegisterGstRate;
  paymentStatus: RegisterPaymentStatus;
  invoiceStatus?: RegisterInvoiceStatus;
}

const SALES_PARTIES: SalesPartySeed[] = [
  { id: 9001, name: "ABC Agro Traders", gstin: "27ABCDE1234F1Z5", state: "Maharashtra" },
  { id: 9002, name: "Green Seeds Pvt Ltd", gstin: "24PQRSX5678A1Z2", state: "Gujarat" },
  { id: 9003, name: "Krishna Retail Store", gstin: "29AABCK5678G1Z2", state: "Karnataka" },
  { id: 9004, name: "Bharat Krishi Kendra", gstin: "08AABCB3456J1Z4", state: "Rajasthan" },
  { id: 9005, name: "Konkan Fertilizer Depot", gstin: "27AABCK7890K1Z1", state: "Maharashtra" },
  { id: 9006, name: "Shree Ganesh Seeds", gstin: "23AABCS2345L1Z6", state: "Madhya Pradesh" },
  { id: 9007, name: "Punjab Agro Mart", gstin: "03AABCP1122M1Z3", state: "Punjab" },
  { id: 9008, name: "Tamil Nadu Crop Care", gstin: "33AABCT9988N1Z7", state: "Tamil Nadu" },
];

const SALES_INVOICE_SEEDS: SalesInvoiceSeed[] = [
  { invoiceNo: "SI-0001", date: "2025-04-02", partyId: 9001, taxable: 120000, gstRate: 18, paymentStatus: "paid" },
  { invoiceNo: "SI-0002", date: "2025-04-04", partyId: 9002, taxable: 85000, gstRate: 18, paymentStatus: "pending" },
  { invoiceNo: "SI-0003", date: "2025-04-07", partyId: 9003, taxable: 64000, gstRate: 12, paymentStatus: "partially_paid" },
  { invoiceNo: "SI-0004", date: "2025-04-10", partyId: 9004, taxable: 97500, gstRate: 5, paymentStatus: "paid" },
  { invoiceNo: "SI-0005", date: "2025-04-12", partyId: 9005, taxable: 142000, gstRate: 18, paymentStatus: "overdue" },
  { invoiceNo: "SI-0006", date: "2025-04-15", partyId: 9006, taxable: 56000, gstRate: 12, paymentStatus: "paid" },
  { invoiceNo: "SI-0007", date: "2025-04-18", partyId: 9007, taxable: 110500, gstRate: 18, paymentStatus: "pending" },
  { invoiceNo: "SI-0008", date: "2025-04-21", partyId: 9008, taxable: 73500, gstRate: 5, paymentStatus: "partially_paid" },
  { invoiceNo: "SI-0009", date: "2025-04-24", partyId: 9001, taxable: 198000, gstRate: 18, paymentStatus: "paid" },
  { invoiceNo: "SI-0010", date: "2025-04-28", partyId: 9002, taxable: 45200, gstRate: 12, paymentStatus: "overdue" },
  { invoiceNo: "SI-0011", date: "2025-05-03", partyId: 9003, taxable: 88000, gstRate: 18, paymentStatus: "paid" },
  { invoiceNo: "SI-0012", date: "2025-05-06", partyId: 9004, taxable: 125600, gstRate: 28, paymentStatus: "pending" },
  { invoiceNo: "SI-0013", date: "2025-05-09", partyId: 9005, taxable: 67000, gstRate: 12, paymentStatus: "partially_paid" },
  { invoiceNo: "SI-0014", date: "2025-05-12", partyId: 9006, taxable: 154000, gstRate: 18, paymentStatus: "paid" },
  { invoiceNo: "SI-0015", date: "2025-05-15", partyId: 9007, taxable: 92000, gstRate: 5, paymentStatus: "overdue" },
  { invoiceNo: "SI-0016", date: "2025-05-18", partyId: 9008, taxable: 103500, gstRate: 18, paymentStatus: "paid" },
  { invoiceNo: "SI-0017", date: "2025-05-22", partyId: 9001, taxable: 76500, gstRate: 12, paymentStatus: "pending" },
  { invoiceNo: "SI-0018", date: "2025-05-25", partyId: 9002, taxable: 134200, gstRate: 18, paymentStatus: "partially_paid" },
  { invoiceNo: "SI-0019", date: "2025-05-28", partyId: 9003, taxable: 48800, gstRate: 5, paymentStatus: "paid" },
  { invoiceNo: "SI-0020", date: "2025-06-02", partyId: 9004, taxable: 176000, gstRate: 18, paymentStatus: "overdue" },
  { invoiceNo: "SI-0021", date: "2025-06-06", partyId: 9005, taxable: 61200, gstRate: 12, paymentStatus: "paid" },
  { invoiceNo: "SI-0022", date: "2025-06-10", partyId: 9006, taxable: 94500, gstRate: 18, paymentStatus: "pending" },
  { invoiceNo: "SI-0023", date: "2025-06-14", partyId: 9007, taxable: 128800, gstRate: 28, paymentStatus: "partially_paid" },
  { invoiceNo: "SI-0024", date: "2025-06-18", partyId: 9008, taxable: 71500, gstRate: 12, paymentStatus: "paid", invoiceStatus: "draft" },
];

function partyById(id: number): SalesPartySeed {
  return SALES_PARTIES.find((p) => p.id === id)!;
}

function seedToRow(seed: SalesInvoiceSeed, index: number): RegisterReportRow {
  const party = partyById(seed.partyId);
  const gstAmount = roundMoney((seed.taxable * seed.gstRate) / 100);
  const invoiceTotal = roundMoney(seed.taxable + gstAmount);

  return {
    id: 91001 + index,
    invoiceDate: seed.date,
    invoiceNo: seed.invoiceNo,
    partyId: party.id,
    partyName: party.name,
    gstin: party.gstin,
    state: party.state,
    taxableValue: seed.taxable,
    gstAmount,
    invoiceTotal,
    paymentStatus: seed.paymentStatus,
    invoiceStatus: seed.invoiceStatus ?? "posted",
    gstRate: seed.gstRate,
    financialYearId: 1,
  };
}

const DEMO_ROWS: RegisterReportRow[] = SALES_INVOICE_SEEDS.map(seedToRow);

export const SALES_REGISTER_PARTY_OPTIONS: RegisterPartyOption[] = SALES_PARTIES.map((p) => ({
  id: p.id,
  name: p.name,
}));

export function buildSalesRegisterDemoRows(): RegisterReportRow[] {
  return [...DEMO_ROWS].sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
}

export function findSalesRegisterDemoRow(id: number): RegisterReportRow | undefined {
  return DEMO_ROWS.find((r) => r.id === id);
}
