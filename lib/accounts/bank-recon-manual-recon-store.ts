/**
 * Manual reconciliation persistence — Step 6.
 */

import type {
  ManualReconAllocationRecord,
  ManualReconAuditEntry,
  ManualReconGroupRecord,
} from "@/lib/accounts/bank-recon-manual-recon-types";

const GROUPS_KEY = "dharitri_bank_recon_manual_recon_groups_v2";
const ALLOC_KEY = "dharitri_bank_recon_manual_recon_alloc_v2";
const AUDIT_KEY = "dharitri_bank_recon_manual_recon_audit_v2";

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

export function createManualReconId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function loadManualReconGroups(bankAccountId?: string): ManualReconGroupRecord[] {
  const rows = read<ManualReconGroupRecord[]>(GROUPS_KEY, []);
  if (!bankAccountId) return rows;
  return rows.filter((g) => g.bankAccountId === bankAccountId);
}

export function loadManualReconAllocations(bankAccountId?: string): ManualReconAllocationRecord[] {
  const rows = read<ManualReconAllocationRecord[]>(ALLOC_KEY, []);
  if (!bankAccountId) return rows;
  return rows.filter((a) => a.bankAccountId === bankAccountId);
}

export function upsertManualReconGroup(group: ManualReconGroupRecord): void {
  const rows = read<ManualReconGroupRecord[]>(GROUPS_KEY, []);
  const idx = rows.findIndex((g) => g.id === group.id);
  if (idx >= 0) rows[idx] = group;
  else rows.push(group);
  write(GROUPS_KEY, rows);
}

export function upsertManualReconAllocation(alloc: ManualReconAllocationRecord): void {
  const rows = read<ManualReconAllocationRecord[]>(ALLOC_KEY, []);
  const idx = rows.findIndex((a) => a.id === alloc.id);
  if (idx >= 0) rows[idx] = alloc;
  else rows.push(alloc);
  write(ALLOC_KEY, rows);
}

export function appendManualReconAudit(entry: Omit<ManualReconAuditEntry, "id" | "timestamp">): void {
  const rows = read<ManualReconAuditEntry[]>(AUDIT_KEY, []);
  rows.unshift({
    ...entry,
    id: createManualReconId("mra"),
    timestamp: new Date().toISOString(),
  });
  write(AUDIT_KEY, rows.slice(0, 800));
}

export function loadManualReconAudit(bankAccountId?: string): ManualReconAuditEntry[] {
  const rows = read<ManualReconAuditEntry[]>(AUDIT_KEY, []);
  if (!bankAccountId) return rows;
  return rows.filter((a) => a.bankAccountId === bankAccountId);
}

export function getActiveAllocationsForBook(
  bankAccountId: string,
  bookTargetId: string,
): ManualReconAllocationRecord[] {
  return loadManualReconAllocations(bankAccountId).filter(
    (a) => a.active && a.bookTargetId === bookTargetId,
  );
}

export function getActiveAllocationsForStatement(
  bankAccountId: string,
  statementTransactionId: string,
): ManualReconAllocationRecord[] {
  return loadManualReconAllocations(bankAccountId).filter(
    (a) => a.active && a.statementTransactionId === statementTransactionId,
  );
}

export function getGroupById(groupId: string): ManualReconGroupRecord | null {
  return read<ManualReconGroupRecord[]>(GROUPS_KEY, []).find((g) => g.id === groupId) ?? null;
}

export function getAllocationsForGroup(groupId: string): ManualReconAllocationRecord[] {
  return read<ManualReconAllocationRecord[]>(ALLOC_KEY, []).filter((a) => a.groupId === groupId);
}

export function deactivateGroupAndAllocations(groupId: string): void {
  const groups = read<ManualReconGroupRecord[]>(GROUPS_KEY, []);
  const allocs = read<ManualReconAllocationRecord[]>(ALLOC_KEY, []);
  write(
    GROUPS_KEY,
    groups.map((g) => (g.id === groupId ? { ...g, active: false, updatedOn: new Date().toISOString() } : g)),
  );
  write(
    ALLOC_KEY,
    allocs.map((a) => (a.groupId === groupId ? { ...a, active: false } : a)),
  );
}
