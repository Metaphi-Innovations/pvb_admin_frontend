/** Shared GST breakup helpers for credit / debit notes. */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface NoteTaxBreakup {
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
  total: number;
}

export function computeNoteTaxBreakup(
  lines: Array<{
    creditAmount?: number;
    debitAmount?: number;
    taxPct?: number;
  }>,
  interstate = false,
): NoteTaxBreakup {
  let taxableValue = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let total = 0;

  for (const line of lines) {
    const amount = line.creditAmount ?? line.debitAmount ?? 0;
    if (amount <= 0) continue;
    total += amount;
    const rate = 1 + (line.taxPct ?? 0) / 100;
    const lineTaxable = round2(amount / rate);
    const lineTax = round2(amount - lineTaxable);
    taxableValue += lineTaxable;
    if (interstate) {
      igstAmount += lineTax;
    } else {
      const half = round2(lineTax / 2);
      cgstAmount += half;
      sgstAmount += round2(lineTax - half);
    }
  }

  return {
    taxableValue: round2(taxableValue),
    cgstAmount: round2(cgstAmount),
    sgstAmount: round2(sgstAmount),
    igstAmount: round2(igstAmount),
    taxAmount: round2(cgstAmount + sgstAmount + igstAmount),
    total: round2(total),
  };
}
