#!/usr/bin/env node
/**
 * Convert India Post CSV export to clean ERP Pincode Master JSON.
 *
 * Usage:
 *   node scripts/convert-india-post-csv.mjs <input.csv> [output.json]
 *
 * Keeps: pincode, state, district, town (from officename)
 * Ignores: circlename, regionname, divisionname, officetype, delivery, latitude, longitude
 *
 * Output JSON is directly consumable by Pincode Master (see pincode-data.ts → PincodeJsonRow).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";

function normalizeHeader(h) {
  return String(h).trim().toLowerCase().replace(/\s+/g, "");
}

function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function pick(row, ...keys) {
  for (const key of Object.keys(row)) {
    const norm = normalizeHeader(key);
    if (keys.some((k) => norm === normalizeHeader(k))) {
      return String(row[key] ?? "").trim();
    }
  }
  return "";
}

function cleanTown(officename) {
  return officename
    .replace(/\s+S\.O\.?$/i, "")
    .replace(/\s+B\.O\.?$/i, "")
    .replace(/\s+H\.O\.?$/i, "")
    .trim() || officename.trim();
}

function convertRows(rawRows) {
  const seen = new Set();
  const out = [];

  for (const row of rawRows) {
    const pincode = pick(row, "pincode");
    const state = pick(row, "statename", "state");
    const district = pick(row, "district");
    const town = cleanTown(pick(row, "officename", "office name", "town"));

    if (!pincode && !state && !district && !town) continue;

    const key = [pincode, state, district, town].join("|").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (!pincode || !state || !district || !town) continue;

    out.push({
      pincode,
      state,
      district,
      town,
    });
  }

  return out;
}

function main() {
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error("Usage: node scripts/convert-india-post-csv.mjs <input.csv> [output.json]");
    process.exit(1);
  }

  const inputPath = resolve(inputArg);
  const outputPath = resolve(
    process.argv[3] ?? inputPath.replace(/\.csv$/i, "") + "-erp-pincodes.json",
  );

  const csv = readFileSync(inputPath, "utf8");
  const rawRows = parseCsv(csv);
  const records = convertRows(rawRows);

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceFile: basename(inputPath),
    recordCount: records.length,
    records,
  };

  writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Converted ${records.length} records → ${outputPath}`);
}

main();
