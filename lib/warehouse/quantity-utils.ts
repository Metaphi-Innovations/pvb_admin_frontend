/**
 * Utility functions for handling dual quantity units (Cases & Loose Pieces) 
 * across the ERP frontend.
 *
 * This bridges the physical reality of the warehouse (pallets with mixed cases/pieces)
 * and the strict mathematical necessity of the database (base_qty as single source of truth).
 */

export interface DualQuantity {
  cases: number;
  pieces: number;
}

/**
 * Decomposes an absolute base quantity into full cases and remaining loose pieces.
 * 
 * @param baseQty The total amount of pieces.
 * @param packSize The number of pieces that make up one full case.
 * @returns An object containing the decomposed { cases, pieces }.
 */
export function decomposeBaseQty(baseQty: number, packSize: number): DualQuantity {
  const safeBaseQty = Number(baseQty) || 0;
  const safePackSize = Number(packSize) || 1; // Default to 1 to avoid division by zero

  // If pack size is effectively 1 or 0 (or not properly set), treat everything as loose pieces
  if (safePackSize <= 1) {
    return { cases: 0, pieces: safeBaseQty };
  }

  const cases = Math.floor(safeBaseQty / safePackSize);
  const pieces = safeBaseQty % safePackSize;

  return { cases, pieces };
}

/**
 * Calculates the total base quantity from a given number of cases and loose pieces.
 * 
 * @param cases Number of full cases.
 * @param pieces Number of loose pieces.
 * @param packSize The number of pieces that make up one full case.
 * @returns The absolute total base quantity (pieces).
 */
export function calculateBaseQty(cases: number, pieces: number, packSize: number): number {
  const safeCases = Number(cases) || 0;
  const safePieces = Number(pieces) || 0;
  const safePackSize = Number(packSize) || 1;

  if (safePackSize <= 1) {
    // If pack size is 1, cases input shouldn't technically be used, but if it is, we add it directly
    return safeCases + safePieces;
  }

  return (safeCases * safePackSize) + safePieces;
}

/**
 * Formats a base quantity into a highly readable string format.
 * Ideal for all tables, read-only views, and summary pages.
 * 
 * Example: `formatQuantity(244, 24)` -> `"10 Cs + 4 Pcs"`
 * 
 * @param baseQty The total amount of pieces.
 * @param packSize The number of pieces that make up one full case.
 * @param showTotal Optionally append `(Total: X Pcs)` to the output string. Default is false.
 * @returns Formatted string.
 */
export function formatQuantity(baseQty: number, packSize: number, showTotal = false): string {
  const safeBaseQty = Number(baseQty) || 0;
  const safePackSize = Number(packSize) || 1;

  if (safePackSize <= 1) {
     return `${safeBaseQty} Pcs`;
  }

  const { cases, pieces } = decomposeBaseQty(safeBaseQty, safePackSize);
  
  let result = `${cases} Cs`;
  if (pieces > 0 || cases === 0) {
     result += ` + ${pieces} Pcs`;
  }

  if (showTotal) {
    result += ` (Total: ${safeBaseQty})`;
  }

  return result;
}
