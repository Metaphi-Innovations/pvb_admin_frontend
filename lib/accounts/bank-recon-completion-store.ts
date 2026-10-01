/**
 * Bank reconciliation completion persistence — Step 7.
 */

import type {
  BankReconCompletionAuditEntry,
  BankReconSessionRecord,
  BankReconSessionSnapshotRecord,
} from "@/lib/accounts/bank-recon-completion-types";

const SESSIONS_KEY = "dharitri_bank_recon_sessions_v2";
const SNAPSHOTS_KEY = "dharitri_bank_recon_session_snapshots_v2";
const COMPLETION_AUDIT_KEY = "dharitri_bank_recon_completion_audit_v2";
const SEQ_KEY = "dharitri_bank_recon_session_seq_v2";
const COMPLETION_META_KEY = "dharitri_bank_recon_completion_meta_v2";

export interface BankReconCompletionAccountMeta {
  bankAccountId: string;
  lastReconciledDate: string | null;
  lastCompletedSessionId: string | null;
  nextPeriodFrom: string | null;
  listingStatus: string | null;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, data: T): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function createSessionId(): string {
  return `brs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createSnapshotId(): string {
  return `brss-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function loadBankReconSessions(bankAccountId?: string): BankReconSessionRecord[] {
  const rows = read<BankReconSessionRecord[]>(SESSIONS_KEY, []);
  if (!bankAccountId) return rows;
  return rows.filter((s) => s.bankAccountId === bankAccountId);
}

export function getSessionById(id: string): BankReconSessionRecord | undefined {
  return read<BankReconSessionRecord[]>(SESSIONS_KEY, []).find((s) => s.id === id);
}

function notifyCompletionUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("bank-recon-completion-updated"));
}

export function upsertBankReconSession(session: BankReconSessionRecord): void {
  const rows = read<BankReconSessionRecord[]>(SESSIONS_KEY, []);
  const idx = rows.findIndex((s) => s.id === session.id);
  if (idx >= 0) rows[idx] = session;
  else rows.push(session);
  write(SESSIONS_KEY, rows);
  notifyCompletionUpdated();
}

export function loadSessionSnapshots(sessionId?: string): BankReconSessionSnapshotRecord[] {
  const rows = read<BankReconSessionSnapshotRecord[]>(SNAPSHOTS_KEY, []);
  if (!sessionId) return rows;
  return rows.filter((s) => s.sessionId === sessionId);
}

export function getSnapshotById(id: string): BankReconSessionSnapshotRecord | undefined {
  return read<BankReconSessionSnapshotRecord[]>(SNAPSHOTS_KEY, []).find((s) => s.id === id);
}

export function saveSessionSnapshot(snapshot: BankReconSessionSnapshotRecord): void {
  const rows = read<BankReconSessionSnapshotRecord[]>(SNAPSHOTS_KEY, []);
  rows.push(snapshot);
  write(SNAPSHOTS_KEY, rows);
}

export function appendCompletionAudit(
  entry: Omit<BankReconCompletionAuditEntry, "id" | "timestamp">,
): void {
  const rows = read<BankReconCompletionAuditEntry[]>(COMPLETION_AUDIT_KEY, []);
  rows.unshift({
    ...entry,
    id: `brca-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  });
  write(COMPLETION_AUDIT_KEY, rows.slice(0, 1200));
  notifyCompletionUpdated();
}

export function loadCompletionAudit(bankAccountId?: string): BankReconCompletionAuditEntry[] {
  const rows = read<BankReconCompletionAuditEntry[]>(COMPLETION_AUDIT_KEY, []);
  if (!bankAccountId) return rows;
  return rows.filter((a) => a.bankAccountId === bankAccountId);
}

export function nextReconciliationSequence(bankCode: string, financialYear: string): number {
  const all = read<Record<string, number>>(SEQ_KEY, {});
  const key = `${bankCode}-${financialYear}`;
  const next = (all[key] ?? 0) + 1;
  all[key] = next;
  write(SEQ_KEY, all);
  return next;
}

export function loadCompletionAccountMeta(bankAccountId: string): BankReconCompletionAccountMeta {
  const all = read<BankReconCompletionAccountMeta[]>(COMPLETION_META_KEY, []);
  return (
    all.find((m) => m.bankAccountId === bankAccountId) ?? {
      bankAccountId,
      lastReconciledDate: null,
      lastCompletedSessionId: null,
      nextPeriodFrom: null,
      listingStatus: null,
    }
  );
}

export function updateCompletionAccountMeta(meta: BankReconCompletionAccountMeta): void {
  const all = read<BankReconCompletionAccountMeta[]>(COMPLETION_META_KEY, []);
  const idx = all.findIndex((m) => m.bankAccountId === meta.bankAccountId);
  if (idx >= 0) all[idx] = meta;
  else all.push(meta);
  write(COMPLETION_META_KEY, all);
}

export function getLatestCompletedSession(bankAccountId: string): BankReconSessionRecord | undefined {
  return loadBankReconSessions(bankAccountId)
    .filter((s) => s.status === "Completed" || s.status === "Completed with Difference")
    .sort((a, b) => (b.completedOn ?? "").localeCompare(a.completedOn ?? ""))[0];
}

export function getActiveLockedSessions(bankAccountId: string): BankReconSessionRecord[] {
  return loadBankReconSessions(bankAccountId).filter(
    (s) => s.locked && s.status !== "Reopened" && s.status !== "Cancelled",
  );
}

export function hasLaterCompletedSession(
  bankAccountId: string,
  periodTo: string,
  excludeSessionId?: string,
): boolean {
  return loadBankReconSessions(bankAccountId).some(
    (s) =>
      s.id !== excludeSessionId &&
      (s.status === "Completed" || s.status === "Completed with Difference") &&
      s.periodFrom > periodTo,
  );
}
