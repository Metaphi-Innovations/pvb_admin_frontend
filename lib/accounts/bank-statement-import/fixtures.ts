/**
 * Demo bank statement fixtures for upload wizard testing.
 */

export interface StatementFixture {
  id: string;
  label: string;
  fileName: string;
  mimeType: string;
  description: string;
  content: string;
}

export const STATEMENT_FIXTURES: StatementFixture[] = [
  {
    id: "hdfc-csv-valid",
    label: "Valid HDFC CSV",
    fileName: "hdfc-jun-2026-sample.csv",
    mimeType: "text/csv",
    description: "Debit/Credit columns, standard HDFC export",
    content: `HDFC Bank Statement
Account,50100123456789
Period,01-Jun-2026 to 30-Jun-2026

Date,Narration,Chq/Ref No,Value Date,Withdrawal Amt,Deposit Amt,Closing Balance
02-06-2026,NEFT CR KRISHNA AGRO INPUTS,UTR HDFC240602001,02-06-2026,,185000.00,3025000.00
03-06-2026,CHQ PAID MAHARASHTRA SEEDS,482901,03-06-2026,245000.00,,2780000.00
05-06-2026,IMPS CR GREENFIELD DISTRIBUTORS,UTR ICIC240605882,05-06-2026,,72500.00,2852500.00
06-06-2026,BANK CHARGES MAINTENANCE JUN,,06-06-2026,590.00,,2851910.00
`,
  },
  {
    id: "icici-debit-credit",
    label: "ICICI Debit/Credit CSV",
    fileName: "icici-collection-jun.csv",
    mimeType: "text/csv",
    description: "Separate debit and credit amount columns",
    content: `Transaction Date,Description,Reference,Debit Amount,Credit Amount,Balance
2026-06-01,UPI CR FIELD AGENT COLLECTION,UPI/8829103344,,28500.00,878500.00
2026-06-04,NEFT CR SHREE BALAJI TRADERS,NEFT ICIC240604112,,156000.00,1034500.00
2026-06-08,TDS DEPOSIT SEC 194Q,TDS DEP 194Q,18450.00,,1016050.00
2026-06-12,INTERNAL FT TO HDFC,FT ICICI TO HDFC,500000.00,,516050.00
`,
  },
  {
    id: "amount-dr-cr",
    label: "Amount + DR/CR Column",
    fileName: "sbi-amount-type.csv",
    mimeType: "text/csv",
    description: "Single amount with transaction type",
    content: `Txn Date,Particulars,Amount,Dr/Cr,Balance
15-06-2026,ATM CASH WDL PUNE FC ROAD,10000.00,DR,1240850.00
16-06-2026,NEFT CR SAHYADRI FARM SERVICES,98000.00,CR,1338850.00
18-06-2026,PROCESSING CHARGES CC RENEWAL,2500.00,DR,1336350.00
`,
  },
  {
    id: "with-duplicates",
    label: "Duplicate Rows in File",
    fileName: "hdfc-duplicates.csv",
    mimeType: "text/csv",
    description: "Same transaction appears twice",
    content: `Date,Narration,Reference,Withdrawal Amt,Deposit Amt,Balance
20-06-2026,NEFT CR TEST DUPLICATE,UTR TESTDUP001,,50000.00,2900000.00
20-06-2026,NEFT CR TEST DUPLICATE,UTR TESTDUP001,,50000.00,2900000.00
21-06-2026,NEFT CR UNIQUE ROW,UTR TESTUNQ001,,25000.00,2925000.00
`,
  },
  {
    id: "already-imported",
    label: "Previously Imported Row",
    fileName: "hdfc-already-imported.csv",
    mimeType: "text/csv",
    description: "Contains UTR HDFC240602001 from demo seed",
    content: `Date,Narration,Reference,Withdrawal Amt,Deposit Amt,Balance
02-06-2026,NEFT CR KRISHNA AGRO INPUTS,UTR HDFC240602001,,185000.00,3025000.00
25-06-2026,NEFT CR NEW ENTRY ONLY,UTR HDFC240625999,,42000.00,3062000.00
`,
  },
  {
    id: "manual-match",
    label: "Matches Manual Entry",
    fileName: "icici-manual-link.csv",
    mimeType: "text/csv",
    description: "TDS line matching manual txn-013",
    content: `Date,Description,Reference,Debit Amount,Credit Amount,Balance
2026-06-08,TDS DEPOSIT SEC 194Q Q1,TDS DEP 194Q,18450.00,,1016050.00
2026-06-20,UPI CR UNALLOCATED,UPI/9910234455,,12500.00,1028550.00
`,
  },
  {
    id: "missing-reference",
    label: "Missing References",
    fileName: "missing-ref.csv",
    mimeType: "text/csv",
    description: "Valid rows without reference numbers",
    content: `Date,Narration,Withdrawal Amt,Deposit Amt,Balance
22-06-2026,CASH DEPOSIT BY COLLECTION AGENT,,15000.00,2945000.00
23-06-2026,SMS ALERT CHARGES Q2,118.00,,2944882.00
`,
  },
  {
    id: "invalid-dates",
    label: "Invalid Dates",
    fileName: "invalid-dates.csv",
    mimeType: "text/csv",
    description: "Contains unparseable date rows",
    content: `Date,Narration,Reference,Withdrawal Amt,Deposit Amt,Balance
NOT-A-DATE,INVALID ROW,,100.00,,100.00
25-06-2026,VALID ROW AFTER INVALID,UTR VALID001,,5000.00,5100.00
`,
  },
  {
    id: "invalid-amounts",
    label: "Invalid Amount Format",
    fileName: "invalid-amounts.csv",
    mimeType: "text/csv",
    description: "Bad amount in one row",
    content: `Date,Narration,Reference,Withdrawal Amt,Deposit Amt,Balance
26-06-2026,BAD AMOUNT ROW,REF001,ABC,,0.00
26-06-2026,GOOD ROW,REF002,,2500.00,2500.00
`,
  },
  {
    id: "balance-mismatch",
    label: "Balance Mismatch",
    fileName: "balance-mismatch.csv",
    mimeType: "text/csv",
    description: "Running balance does not tie",
    content: `Date,Narration,Reference,Withdrawal Amt,Deposit Amt,Closing Balance
27-06-2026,DEPOSIT TEST,UTR BAL001,,10000.00,999999.00
28-06-2026,WITHDRAWAL TEST,UTR BAL002,5000.00,,994999.00
`,
  },
];

export function downloadFixture(fixture: StatementFixture): void {
  const blob = new Blob([fixture.content], { type: fixture.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fixture.fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSampleFormat(bankLabel = "Bank"): void {
  const content = `Date,Narration,Reference,Value Date,Withdrawal Amt,Deposit Amt,Closing Balance
01-06-2026,Sample ${bankLabel} Credit Entry,UTR SAMPLE001,01-06-2026,,50000.00,1050000.00
02-06-2026,Sample ${bankLabel} Debit Entry,CHQ 123456,02-06-2026,10000.00,,1040000.00
`;
  downloadFixture({
    id: "sample",
    label: "Sample",
    fileName: "bank-statement-sample-format.csv",
    mimeType: "text/csv",
    description: "Sample format",
    content,
  });
}

export function fixtureToFile(fixture: StatementFixture): File {
  return new File([fixture.content], fixture.fileName, { type: fixture.mimeType });
}
