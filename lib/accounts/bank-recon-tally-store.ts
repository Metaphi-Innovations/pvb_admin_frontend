/**
 * Tally-style reconciliation link store (localStorage).
 * Does not mutate vouchers or posting data.
 */

import type { BankReconSuggestion, BankReconTallyLink } from "@/lib/accounts/bank-recon-tally-types";
import { TALLY_EVENT } from "@/lib/accounts/bank-recon-tally-types";

const LINK_KEY = "dharitri_bank_recon_tally_links_v1";
const SUGGESTION_KEY = "dharitri_bank_recon_tally_suggestions_v1";
const SEED_KEY = "dharitri_bank_recon_tally_seed_version";
const UNDO_AUDIT_KEY = "dharitri_bank_recon_tally_undo_audit_v1";
export const TALLY_SEED_VERSION = "tally-v4-manual-overlay";

/** Demo-only recon localStorage keys that may be version-reset. Never touches voucher/COA user data. */
const RECON_DEMO_STORAGE_KEYS = [
  "dharitri_bank_recon_tally_links_v1",
  "dharitri_bank_recon_tally_suggestions_v1",
  "dharitri_bank_recon_tally_seed_version",
  "dharitri_bank_recon_tally_undo_audit_v1",
  // Legacy statement register keys — cleared on migrate/reset so they never surface in manual UI.
  "dharitri_bank_recon_transactions_v2",
  "dharitri_bank_recon_import_batches_v2",
  "dharitri_bank_recon_account_meta_v2",
] as const;

export interface BankReconUndoAuditEntry {
  id: string;
  linkId: string;
  bankAccountId: string;
  bookTransactionId: string | null;
  bankDate: string | null;
  reason: string;
  undoneBy: string;
  undoneAt: string;
}

/**
 * When the tally seed version changes, clear only recon demo link/suggestion keys
 * so repaired ledger mappings re-initialize. Does not delete vouchers, COA, or bank masters.
 */
export function migrateReconDemoStorageIfNeeded(): void {
  if (!isBrowser()) return;
  const current = localStorage.getItem(SEED_KEY);
  if (current === TALLY_SEED_VERSION) return;
  for (const key of RECON_DEMO_STORAGE_KEYS) {
    if (key === SEED_KEY) continue;
    localStorage.removeItem(key);
  }
  // Also clear any other dharitri_bank_recon_* keys (never vouchers/COA).
  clearAllBankReconLocalStorageKeys({ keepSeedKey: false });
}

/** Remove every localStorage key that starts with dharitri_bank_recon_. */
export function clearAllBankReconLocalStorageKeys(opts?: { keepSeedKey?: boolean }): void {
  if (!isBrowser()) return;
  const keepSeed = opts?.keepSeedKey === true;
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (!key.startsWith("dharitri_bank_recon_")) continue;
    if (keepSeed && key === SEED_KEY) continue;
    toRemove.push(key);
  }
  for (const key of toRemove) localStorage.removeItem(key);
}

/** Full demo reset: clear recon keys so seed re-runs. */
export function resetBankReconciliationDemoStorage(): void {
  if (!isBrowser()) return;
  clearAllBankReconLocalStorageKeys({ keepSeedKey: false });
}

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

export function notifyTallyUpdated(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(TALLY_EVENT));
}

export function getTallySeedVersion(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(SEED_KEY);
}

export function setTallySeedVersion(version: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(SEED_KEY, version);
}

/** In-memory guard so seed cannot re-enter via TALLY_EVENT mid-write. */
let tallySeedInProgress = false;

export function beginTallySeed(): boolean {
  if (tallySeedInProgress) return false;
  tallySeedInProgress = true;
  return true;
}

export function endTallySeed(): void {
  tallySeedInProgress = false;
}

export function isTallySeedInProgress(): boolean {
  return tallySeedInProgress;
}

export function loadTallyLinks(bankAccountId?: string): BankReconTallyLink[] {
  const rows = readJson<BankReconTallyLink[]>(LINK_KEY, []);
  if (!bankAccountId) return rows;
  return rows.filter((r) => r.bankAccountId === bankAccountId);
}

export function saveTallyLinks(links: BankReconTallyLink[], opts?: { silent?: boolean }): void {
  writeJson(LINK_KEY, links);
  if (!opts?.silent) notifyTallyUpdated();
}

export function upsertTallyLink(link: BankReconTallyLink): void {
  const all = loadTallyLinks();
  const idx = all.findIndex((l) => l.id === link.id);
  if (idx >= 0) all[idx] = link;
  else all.push(link);
  saveTallyLinks(all);
}

export function removeTallyLink(linkId: string): void {
  saveTallyLinks(loadTallyLinks().filter((l) => l.id !== linkId));
}

export function getTallyLinkById(linkId: string): BankReconTallyLink | undefined {
  return loadTallyLinks().find((l) => l.id === linkId);
}

export function findActiveLinkForBook(bookTransactionId: string): BankReconTallyLink | undefined {
  return loadTallyLinks().find(
    (l) =>
      l.bookTransactionId === bookTransactionId &&
      (l.status === "RECONCILED" || l.status === "MARKED_FOR_REVIEW"),
  );
}

export function findActiveLinkForStatement(
  bankStatementTransactionId: string,
): BankReconTallyLink | undefined {
  return loadTallyLinks().find(
    (l) =>
      l.bankStatementTransactionId === bankStatementTransactionId &&
      (l.status === "RECONCILED" || l.status === "MARKED_FOR_REVIEW" || l.status === "IGNORED"),
  );
}

export function loadTallySuggestions(bankAccountId?: string): BankReconSuggestion[] {
  const rows = readJson<BankReconSuggestion[]>(SUGGESTION_KEY, []);
  if (!bankAccountId) return rows;
  const bookPrefix = `book:${bankAccountId}:`;
  return rows.filter((s) => s.bookTransactionId.startsWith(bookPrefix));
}

/** Suggestions are stored globally; filter by book/statement membership in service. */
export function saveTallySuggestions(
  suggestions: BankReconSuggestion[],
  opts?: { silent?: boolean },
): void {
  writeJson(SUGGESTION_KEY, suggestions);
  if (!opts?.silent) notifyTallyUpdated();
}

export function replaceAccountSuggestions(
  bankAccountId: string,
  suggestions: BankReconSuggestion[],
  bookIds: Set<string>,
  statementIds: Set<string>,
): void {
  const others = loadTallySuggestions().filter(
    (s) => !bookIds.has(s.bookTransactionId) && !statementIds.has(s.bankStatementTransactionId),
  );
  // Also drop stale suggestions that reference this account's books/statements
  const kept = others.filter(
    (s) =>
      !s.bookTransactionId.includes(`:${bankAccountId}:`) &&
      !statementIds.has(s.bankStatementTransactionId),
  );
  saveTallySuggestions([...kept, ...suggestions]);
}

export function createTallyLinkId(): string {
  return `tally-link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadUndoAuditEntries(): BankReconUndoAuditEntry[] {
  return readJson<BankReconUndoAuditEntry[]>(UNDO_AUDIT_KEY, []);
}

export function appendUndoAuditEntry(entry: BankReconUndoAuditEntry): void {
  const all = loadUndoAuditEntries();
  all.unshift(entry);
  writeJson(UNDO_AUDIT_KEY, all.slice(0, 200));
}
