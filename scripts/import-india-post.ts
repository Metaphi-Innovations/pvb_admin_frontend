#!/usr/bin/env npx tsx
/**
 * Import Official India Post CSV/JSON → ERP postal-master.json
 *
 * Source: data.gov.in / India Post Pincode Directory
 *
 * Usage:
 *   npx tsx scripts/import-india-post.ts <input.csv|input.json> [output.json] [--full]
 *
 * Default input:  data/all-india-pincode.csv (if present)
 * Default output: public/data/postal-master.json
 *
 * Without --full, produces a practical 10k–20k record dataset for frontend testing.
 * With --full, writes every normalized record (for production-scale imports).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, basename, dirname } from "node:path";
import {
  buildPracticalDataset,
  dedupeMappedRows,
  mapRawCsvRow,
  parseCsvText,
  parsePostalMasterJson,
  summarizePostalRows,
  toErpJsonRow,
  toNormalizedRows,
  type ErpPostalJsonRow,
  type MappedPostalRow,
} from "../lib/geography/india-post-normalize";

const DEFAULT_INPUT = resolve("data/all-india-pincode.csv");
const DEFAULT_OUTPUT = resolve("public/data/postal-master.json");

function parseArgs(argv: string[]): { inputPath: string; outputPath: string; full: boolean } {
  const positional: string[] = [];
  let full = false;
  for (const arg of argv) {
    if (arg === "--full") full = true;
    else positional.push(arg);
  }
  const inputPath = resolve(positional[0] ?? DEFAULT_INPUT);
  const outputPath = resolve(positional[1] ?? DEFAULT_OUTPUT);
  return { inputPath, outputPath, full };
}

function loadMappedRows(inputPath: string): MappedPostalRow[] {
  if (!existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    console.error(
      "Download the official All India Pincode Directory CSV from data.gov.in",
      "and place it at data/all-india-pincode.csv, or pass a path explicitly.",
    );
    process.exit(1);
  }

  const raw = readFileSync(inputPath, "utf8");

  if (inputPath.toLowerCase().endsWith(".json")) {
    const normalized = parsePostalMasterJson(JSON.parse(raw));
    return normalized.map((row) => ({
      ...row,
      officePriority: 50,
    }));
  }

  const rows = parseCsvText(raw);
  const mapped = rows
    .map((row) => mapRawCsvRow(row))
    .filter((r): r is NonNullable<ReturnType<typeof mapRawCsvRow>> => r != null);

  return dedupeMappedRows(mapped);
}

function main(): void {
  const { inputPath, outputPath, full } = parseArgs(process.argv.slice(2));

  console.log(`Reading ${inputPath}…`);
  const allMapped = loadMappedRows(inputPath);
  console.log(`Parsed ${allMapped.length.toLocaleString()} unique records from source.`);

  const selected = full ? allMapped : buildPracticalDataset(allMapped);
  const normalized = toNormalizedRows(selected);
  const output: ErpPostalJsonRow[] = normalized.map(toErpJsonRow);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(output), "utf8");

  const summary = summarizePostalRows(normalized);
  const mode = full ? "full" : "practical";

  console.log(`\nImported ${summary.records.toLocaleString()} postal records (${mode}) → ${outputPath}`);
  console.log(`Source: ${basename(inputPath)}`);
  console.log("\nSummary:");
  console.log(`  States:     ${summary.states}`);
  console.log(`  Districts:  ${summary.districts}`);
  console.log(`  Cities:     ${summary.cities}`);
  console.log(`  Towns:      ${summary.towns}`);
  console.log(`  Pincodes:   ${summary.pincodes}`);
}

main();
