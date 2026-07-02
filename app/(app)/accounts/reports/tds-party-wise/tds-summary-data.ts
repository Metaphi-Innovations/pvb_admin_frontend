export type TdsPartyType =
  | "Supplier"
  | "Contractor"
  | "Professional"
  | "Employee"
  | "Other";

export interface TdsSummaryRow {
  id: string;
  partyName: string;
  partyType: TdsPartyType;
  pan: string;
  tdsSection: string;
  tdsSectionName: string;
  grossAmount: number;
  tdsRate: number;
  tdsAmount: number;
  netPayable: number;
}

export type TdsSummaryLineKind = "section" | "data" | "total";

export interface TdsSummaryLine {
  id: string;
  kind: TdsSummaryLineKind;
  label?: string;
  row?: TdsSummaryRow;
}

export interface TdsSummaryFilters {
  partyType: string;
  tdsSection: string;
  search: string;
}

export interface TdsSummaryTotals {
  totalGross: number;
  totalTds: number;
  totalNet: number;
}

const TDS_SEED_ROWS: TdsSummaryRow[] = [
  {
    id: "tds-1",
    partyName: "Green Logistics",
    partyType: "Contractor",
    pan: "AABCG1234K",
    tdsSection: "194C",
    tdsSectionName: "Contractor",
    grossAmount: 240000,
    tdsRate: 1,
    tdsAmount: 2400,
    netPayable: 237600,
  },
  {
    id: "tds-2",
    partyName: "BuildRight Contractors",
    partyType: "Contractor",
    pan: "AAKCB5678R",
    tdsSection: "194C",
    tdsSectionName: "Contractor",
    grossAmount: 185000,
    tdsRate: 2,
    tdsAmount: 3700,
    netPayable: 181300,
  },
  {
    id: "tds-3",
    partyName: "Mehta & Associates",
    partyType: "Professional",
    pan: "AADFM4567P",
    tdsSection: "194J",
    tdsSectionName: "Professional Fees",
    grossAmount: 150000,
    tdsRate: 10,
    tdsAmount: 15000,
    netPayable: 135000,
  },
  {
    id: "tds-4",
    partyName: "Legal Advisory Services",
    partyType: "Professional",
    pan: "AAAPL8901Q",
    tdsSection: "194J",
    tdsSectionName: "Professional Fees",
    grossAmount: 85000,
    tdsRate: 10,
    tdsAmount: 8500,
    netPayable: 76500,
  },
  {
    id: "tds-5",
    partyName: "Agro Sales Partner",
    partyType: "Contractor",
    pan: "AAKFA6789D",
    tdsSection: "194H",
    tdsSectionName: "Commission",
    grossAmount: 95000,
    tdsRate: 5,
    tdsAmount: 4750,
    netPayable: 90250,
  },
  {
    id: "tds-6",
    partyName: "City Office Rentals",
    partyType: "Other",
    pan: "AACFC3210M",
    tdsSection: "194I",
    tdsSectionName: "Rent",
    grossAmount: 360000,
    tdsRate: 10,
    tdsAmount: 36000,
    netPayable: 324000,
  },
  {
    id: "tds-7",
    partyName: "Prime Warehouse LLP",
    partyType: "Supplier",
    pan: "AAFCP7890L",
    tdsSection: "194Q",
    tdsSectionName: "Purchase of Goods",
    grossAmount: 820000,
    tdsRate: 0.1,
    tdsAmount: 820,
    netPayable: 819180,
  },
  {
    id: "tds-8",
    partyName: "Agro Chem Distributors",
    partyType: "Supplier",
    pan: "AABCA2345N",
    tdsSection: "194Q",
    tdsSectionName: "Purchase of Goods",
    grossAmount: 450000,
    tdsRate: 0.1,
    tdsAmount: 450,
    netPayable: 449550,
  },
  {
    id: "tds-9",
    partyName: "Rajesh Kumar",
    partyType: "Employee",
    pan: "ABCPK1234F",
    tdsSection: "192",
    tdsSectionName: "Salary",
    grossAmount: 540000,
    tdsRate: 10,
    tdsAmount: 54000,
    netPayable: 486000,
  },
  {
    id: "tds-10",
    partyName: "Priya Sharma",
    partyType: "Employee",
    pan: "ABCPR5678G",
    tdsSection: "192",
    tdsSectionName: "Salary",
    grossAmount: 420000,
    tdsRate: 5,
    tdsAmount: 21000,
    netPayable: 399000,
  },
];

const SECTION_ORDER = ["194C", "194J", "194H", "194I", "194Q", "192"];

export const TDS_SECTION_OPTIONS = [
  { value: "194C", label: "194C — Contractor" },
  { value: "194J", label: "194J — Professional Fees" },
  { value: "194H", label: "194H — Commission" },
  { value: "194I", label: "194I — Rent" },
  { value: "194Q", label: "194Q — Purchase of Goods" },
  { value: "192", label: "192 — Salary" },
] as const;

function filterRows(filters: TdsSummaryFilters): TdsSummaryRow[] {
  const q = filters.search.trim().toLowerCase();
  return TDS_SEED_ROWS.filter((row) => {
    if (filters.partyType !== "all" && row.partyType !== filters.partyType) return false;
    if (filters.tdsSection !== "all" && row.tdsSection !== filters.tdsSection) return false;
    if (!q) return true;
    return (
      row.partyName.toLowerCase().includes(q) ||
      row.pan.toLowerCase().includes(q) ||
      row.tdsSection.toLowerCase().includes(q) ||
      row.tdsSectionName.toLowerCase().includes(q)
    );
  });
}

export function buildTdsSummaryStatement(filters: TdsSummaryFilters): {
  lines: TdsSummaryLine[];
  totals: TdsSummaryTotals;
  hasData: boolean;
} {
  const rows = filterRows(filters);
  if (rows.length === 0) {
    return {
      lines: [],
      totals: { totalGross: 0, totalTds: 0, totalNet: 0 },
      hasData: false,
    };
  }

  const lines: TdsSummaryLine[] = [];
  const grouped = new Map<string, TdsSummaryRow[]>();

  for (const row of rows) {
    const list = grouped.get(row.tdsSection) ?? [];
    list.push(row);
    grouped.set(row.tdsSection, list);
  }

  for (const section of SECTION_ORDER) {
    const sectionRows = grouped.get(section);
    if (!sectionRows?.length) continue;
    const sectionName = sectionRows[0].tdsSectionName;
    lines.push({
      id: `sec-${section}`,
      kind: "section",
      label: `${section} — ${sectionName}`,
    });
    for (const row of sectionRows) {
      lines.push({ id: row.id, kind: "data", row });
    }
  }

  const totalGross = rows.reduce((a, r) => a + r.grossAmount, 0);
  const totalTds = rows.reduce((a, r) => a + r.tdsAmount, 0);
  const totalNet = rows.reduce((a, r) => a + r.netPayable, 0);

  lines.push({ id: "total-row", kind: "total" });

  return {
    lines,
    totals: { totalGross, totalTds, totalNet },
    hasData: true,
  };
}

export function formatTdsRate(rate: number): string {
  if (rate === 0.1) return "0.1%";
  return `${rate}%`;
}

export interface TdsSummaryExportRow {
  partyName: string;
  partyType: string;
  pan: string;
  tdsSection: string;
  grossAmount: number | null;
  tdsRate: string;
  tdsAmount: number | null;
  netPayable: number | null;
  rowType: TdsSummaryLineKind;
}

export function flattenTdsSummaryForExport(lines: TdsSummaryLine[]): TdsSummaryExportRow[] {
  return lines.map((line) => {
    if (line.kind === "section") {
      return {
        partyName: line.label ?? "",
        partyType: "",
        pan: "",
        tdsSection: "",
        grossAmount: null,
        tdsRate: "",
        tdsAmount: null,
        netPayable: null,
        rowType: "section",
      };
    }
    if (line.kind === "total") {
      return {
        partyName: "Totals",
        partyType: "",
        pan: "",
        tdsSection: "",
        grossAmount: null,
        tdsRate: "",
        tdsAmount: null,
        netPayable: null,
        rowType: "total",
      };
    }
    const r = line.row!;
    return {
      partyName: r.partyName,
      partyType: r.partyType,
      pan: r.pan,
      tdsSection: r.tdsSection,
      grossAmount: r.grossAmount,
      tdsRate: formatTdsRate(r.tdsRate),
      tdsAmount: r.tdsAmount,
      netPayable: r.netPayable,
      rowType: "data",
    };
  });
}
