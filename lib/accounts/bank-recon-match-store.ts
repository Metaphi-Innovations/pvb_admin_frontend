/**
 * Match links, run results, config and audit persistence — Step 4.
 */

import type {
  AutoMatchRunResult,
  BankReconMatchAuditEntry,
  BankReconMatchConfig,
  BankReconMatchLink,
} from "@/lib/accounts/bank-recon-match-types";
import { DEFAULT_MATCH_CONFIG } from "@/lib/accounts/bank-recon-match-types";

const LINKS_KEY = "dharitri_bank_recon_match_links_v2";
const RUN_KEY = "dharitri_bank_recon_match_run_v2";
const CONFIG_KEY = "dharitri_bank_recon_match_config_v2";
const AUDIT_KEY = "dharitri_bank_recon_match_audit_v2";
const REJECTED_KEY = "dharitri_bank_recon_match_rejected_v2";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadMatchLinks(bankAccountId?: string): BankReconMatchLink[] {
  const all = readJson<BankReconMatchLink[]>(LINKS_KEY, []);
  return bankAccountId ? all.filter((l) => l.bankAccountId === bankAccountId && l.active) : all.filter((l) => l.active);
}

export function saveMatchLinks(links: BankReconMatchLink[]): void {
  writeJson(LINKS_KEY, links);
}

export function upsertMatchLink(link: BankReconMatchLink): void {
  const all = readJson<BankReconMatchLink[]>(LINKS_KEY, []);
  const idx = all.findIndex((l) => l.id === link.id);
  if (idx >= 0) all[idx] = link;
  else all.push(link);
  saveMatchLinks(all);
}

export function getMatchLinkForStatement(statementTransactionId: string): BankReconMatchLink | undefined {
  return readJson<BankReconMatchLink[]>(LINKS_KEY, []).find(
    (l) => l.statementTransactionId === statementTransactionId && l.active,
  );
}

export function getMatchLinkForBookTarget(bookTargetId: string): BankReconMatchLink | undefined {
  return readJson<BankReconMatchLink[]>(LINKS_KEY, []).find(
    (l) => l.bookTargetId === bookTargetId && l.active,
  );
}

export function loadMatchRun(bankAccountId: string): AutoMatchRunResult | null {
  const map = readJson<Record<string, AutoMatchRunResult>>(RUN_KEY, {});
  return map[bankAccountId] ?? null;
}

export function saveMatchRun(result: AutoMatchRunResult): void {
  const map = readJson<Record<string, AutoMatchRunResult>>(RUN_KEY, {});
  map[result.bankAccountId] = result;
  writeJson(RUN_KEY, map);
}

export function loadMatchConfig(bankAccountId?: string): BankReconMatchConfig {
  const map = readJson<Record<string, BankReconMatchConfig>>(CONFIG_KEY, {});
  if (bankAccountId && map[bankAccountId]) return { ...DEFAULT_MATCH_CONFIG, ...map[bankAccountId] };
  if (map._global) return { ...DEFAULT_MATCH_CONFIG, ...map._global };
  return { ...DEFAULT_MATCH_CONFIG };
}

export function saveMatchConfig(config: BankReconMatchConfig, bankAccountId?: string): void {
  const map = readJson<Record<string, BankReconMatchConfig>>(CONFIG_KEY, {});
  map[bankAccountId ?? "_global"] = config;
  writeJson(CONFIG_KEY, map);
}

export function appendMatchAudit(entry: BankReconMatchAuditEntry): void {
  const all = readJson<BankReconMatchAuditEntry[]>(AUDIT_KEY, []);
  all.unshift(entry);
  writeJson(AUDIT_KEY, all.slice(0, 500));
}

export function loadMatchAudit(bankAccountId?: string): BankReconMatchAuditEntry[] {
  const all = readJson<BankReconMatchAuditEntry[]>(AUDIT_KEY, []);
  if (!bankAccountId) return all;
  return all.filter((a) => a.bankAccountId === bankAccountId);
}

export interface RejectedSuggestion {
  statementTransactionId: string;
  bookTargetId: string;
  reason: string;
  rejectedOn: string;
  rejectedBy: string;
}

export function loadRejectedSuggestions(bankAccountId: string): RejectedSuggestion[] {
  const map = readJson<Record<string, RejectedSuggestion[]>>(REJECTED_KEY, {});
  return map[bankAccountId] ?? [];
}

export function addRejectedSuggestion(bankAccountId: string, item: RejectedSuggestion): void {
  const map = readJson<Record<string, RejectedSuggestion[]>>(REJECTED_KEY, {});
  const list = map[bankAccountId] ?? [];
  list.push(item);
  map[bankAccountId] = list;
  writeJson(REJECTED_KEY, map);
}

export function isRejectedPair(
  bankAccountId: string,
  statementTransactionId: string,
  bookTargetId: string,
): boolean {
  return loadRejectedSuggestions(bankAccountId).some(
    (r) => r.statementTransactionId === statementTransactionId && r.bookTargetId === bookTargetId,
  );
}

export function createMatchLinkId(): string {
  return `mlink-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createAuditId(): string {
  return `maudit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
