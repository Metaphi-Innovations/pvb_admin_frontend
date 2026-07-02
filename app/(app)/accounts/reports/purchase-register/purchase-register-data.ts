import { roundMoney } from "@/lib/accounts/money-format";
import type {
  RegisterGstRate,
  RegisterInvoiceStatus,
  RegisterPartyOption,
  RegisterPaymentStatus,
  RegisterReportRow,
} from "../register-shared/register-types";

interface PurchasePartySeed {
  id: number;
  name: string;
  gstin: string;
  state: string;
}

interface PurchaseInvoiceSeed {
  invoiceNo: string;
  date: string;
  partyId: number;
  taxable: number;
  gstRate: RegisterGstRate;
  paymentStatus: RegisterPaymentStatus;
  invoiceStatus?: RegisterInvoiceStatus;
}

const PURCHASE_PARTIES: PurchasePartySeed[] = [
  { id: 8001, name: "Green Agro Suppliers", gstin: "27ABCDE4567P1Z6", state: "Maharashtra" },
  { id: 8002, name: "Crop Chemicals Ltd", gstin: "24XYZAB7890L1Z3", state: "Gujarat" },
  { id: 8003, name: "National Fertilizers Co", gstin: "29AABCN3344F1Z1", state: "Karnataka" },
  { id: 8004, name: "Rajasthan Agro Inputs", gstin: "08AABCR5566G1Z9", state: "Rajasthan" },
  { id: 8005, name: "Western Seeds Corporation", gstin: "27AABCW7788H1Z2", state: "Maharashtra" },
  { id: 8006, name: "Herbicide India Pvt Ltd", gstin: "23AABCH9900J1Z5", state: "Madhya Pradesh" },
  { id: 8007, name: "Punjab Crop Solutions", gstin: "03AABCP4455K1Z8", state: "Punjab" },
  { id: 8008, name: "South India Agro Chem", gstin: "33AABCS6677L1Z4", state: "Tamil Nadu" },
];

const PURCHASE_INVOICE_SEEDS: PurchaseInvoiceSeed[] = [
  { invoiceNo: "PI-0001", date: "2025-04-01", partyId: 8001, taxable: 95000, gstRate: 18, paymentStatus: "paid" },
  { invoiceNo: "PI-0002", date: "2025-04-03", partyId: 8002, taxable: 160000, gstRate: 18, paymentStatus: "pending" },
  { invoiceNo: "PI-0003", date: "2025-04-05", partyId: 8003, taxable: 72000, gstRate: 12, paymentStatus: "partially_paid" },
  { invoiceNo: "PI-0004", date: "2025-04-08", partyId: 8004, taxable: 118500, gstRate: 5, paymentStatus: "paid" },
  { invoiceNo: "PI-0005", date: "2025-04-11", partyId: 8005, taxable: 205000, gstRate: 18, paymentStatus: "overdue" },
  { invoiceNo: "PI-0006", date: "2025-04-14", partyId: 8006, taxable: 84000, gstRate: 12, paymentStatus: "paid" },
  { invoiceNo: "PI-0007", date: "2025-04-17", partyId: 8007, taxable: 132600, gstRate: 18, paymentStatus: "pending" },
  { invoiceNo: "PI-0008", date: "2025-04-20", partyId: 8008, taxable: 67500, gstRate: 5, paymentStatus: "partially_paid" },
  { invoiceNo: "PI-0009", date: "2025-04-23", partyId: 8001, taxable: 187000, gstRate: 18, paymentStatus: "paid" },
  { invoiceNo: "PI-0010", date: "2025-04-26", partyId: 8002, taxable: 54800, gstRate: 12, paymentStatus: "overdue" },
  { invoiceNo: "PI-0011", date: "2025-04-29", partyId: 8003, taxable: 99000, gstRate: 18, paymentStatus: "paid" },
  { invoiceNo: "PI-0012", date: "2025-05-04", partyId: 8004, taxable: 145200, gstRate: 28, paymentStatus: "pending" },
  { invoiceNo: "PI-0013", date: "2025-05-07", partyId: 8005, taxable: 78000, gstRate: 12, paymentStatus: "partially_paid" },
  { invoiceNo: "PI-0014", date: "2025-05-10", partyId: 8006, taxable: 168500, gstRate: 18, paymentStatus: "paid" },
  { invoiceNo: "PI-0015", date: "2025-05-13", partyId: 8007, taxable: 102400, gstRate: 5, paymentStatus: "overdue" },
  { invoiceNo: "PI-0016", date: "2025-05-16", partyId: 8008, taxable: 119800, gstRate: 18, paymentStatus: "paid" },
  { invoiceNo: "PI-0017", date: "2025-05-20", partyId: 8001, taxable: 86500, gstRate: 12, paymentStatus: "pending" },
  { invoiceNo: "PI-0018", date: "2025-05-23", partyId: 8002, taxable: 156300, gstRate: 18, paymentStatus: "partially_paid" },
  { invoiceNo: "PI-0019", date: "2025-05-27", partyId: 8003, taxable: 52400, gstRate: 5, paymentStatus: "paid" },
  { invoiceNo: "PI-0020", date: "2025-05-30", partyId: 8004, taxable: 192000, gstRate: 18, paymentStatus: "overdue" },
  { invoiceNo: "PI-0021", date: "2025-06-04", partyId: 8005, taxable: 69800, gstRate: 12, paymentStatus: "paid" },
  { invoiceNo: "PI-0022", date: "2025-06-08", partyId: 8006, taxable: 108600, gstRate: 18, paymentStatus: "pending" },
  { invoiceNo: "PI-0023", date: "2025-06-12", partyId: 8007, taxable: 141200, gstRate: 28, paymentStatus: "partially_paid" },
  { invoiceNo: "PI-0024", date: "2025-06-16", partyId: 8008, taxable: 81200, gstRate: 12, paymentStatus: "paid", invoiceStatus: "draft" },
];

function partyById(id: number): PurchasePartySeed {
  return PURCHASE_PARTIES.find((p) => p.id === id)!;
}

function seedToRow(seed: PurchaseInvoiceSeed, index: number): RegisterReportRow {
  const party = partyById(seed.partyId);
  const gstAmount = roundMoney((seed.taxable * seed.gstRate) / 100);
  const invoiceTotal = roundMoney(seed.taxable + gstAmount);

  return {
    id: 92001 + index,
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

const DEMO_ROWS: RegisterReportRow[] = PURCHASE_INVOICE_SEEDS.map(seedToRow);

export const PURCHASE_REGISTER_PARTY_OPTIONS: RegisterPartyOption[] = PURCHASE_PARTIES.map((p) => ({
  id: p.id,
  name: p.name,
}));

export function buildPurchaseRegisterDemoRows(): RegisterReportRow[] {
  return [...DEMO_ROWS].sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
}

export function findPurchaseRegisterDemoRow(id: number): RegisterReportRow | undefined {
  return DEMO_ROWS.find((r) => r.id === id);
}
