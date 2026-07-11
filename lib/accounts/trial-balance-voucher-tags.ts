/**
 * Resolve branch / warehouse tags for posted vouchers from ERP source documents.
 */

import {
  matchesMultiFilter,
  normalizeMultiFilter,
} from "@/lib/accounts/report-multi-filter-utils";

import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { loadPurchaseInvoices } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadCreditNotes } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { loadDebitNotes } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import {
  getVoucherCacheGeneration,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";

export interface VoucherTransactionTags {
  branch: string;
  warehouse: string;
  customerId: number | null;
  vendorId: number | null;
}

let tagIndex: Map<string, VoucherTransactionTags> | null = null;
let tagIndexEpoch = -1;

function emptyTags(): VoucherTransactionTags {
  return { branch: "", warehouse: "", customerId: null, vendorId: null };
}

function buildSourceDocumentTagIndex(): Map<string, VoucherTransactionTags> {
  const map = new Map<string, VoucherTransactionTags>();

  const put = (key: string, tags: VoucherTransactionTags) => {
    const k = key.trim();
    if (!k) return;
    map.set(k, tags);
  };

  for (const inv of loadInvoices()) {
    if (inv.invoiceStatus === "cancelled") continue;
    const tags = {
      branch: inv.branch?.trim() || "",
      warehouse: inv.warehouse?.trim() || "",
      customerId: inv.customerId,
      vendorId: null,
    };
    put(inv.invoiceNo, tags);
    if (inv.referenceNo?.trim()) put(inv.referenceNo, tags);
  }

  for (const pi of loadPurchaseInvoices()) {
    const tags = {
      branch: (pi as { branch?: string }).branch?.trim() || "Head Office",
      warehouse: (pi as { warehouse?: string }).warehouse?.trim() || "",
      customerId: null,
      vendorId: pi.vendorId ?? null,
    };
    put(pi.invoiceNo, tags);
    if (pi.vendorInvoiceNo?.trim()) put(pi.vendorInvoiceNo, tags);
    if (pi.grnNo?.trim()) put(pi.grnNo, tags);
  }

  for (const cn of loadCreditNotes()) {
    if (cn.status === "cancelled") continue;
    const tags = {
      branch: (cn as { branch?: string }).branch?.trim() || "",
      warehouse: "",
      customerId: cn.customerId,
      vendorId: null,
    };
    put(cn.creditNoteNo, tags);
    if (cn.sourceInvoiceNo?.trim()) {
      const src = map.get(cn.sourceInvoiceNo.trim());
      if (src) {
        put(cn.creditNoteNo, { ...src, customerId: cn.customerId ?? src.customerId });
      }
    }
  }

  for (const dn of loadDebitNotes()) {
    if (dn.status === "cancelled") continue;
    put(dn.debitNoteNo, {
      branch: "",
      warehouse: "",
      customerId: null,
      vendorId: dn.vendorId,
    });
  }

  return map;
}

function ensureTagIndex(): Map<string, VoucherTransactionTags> {
  const epoch = getVoucherCacheGeneration();
  if (tagIndex && tagIndexEpoch === epoch) return tagIndex;
  tagIndex = buildSourceDocumentTagIndex();
  tagIndexEpoch = epoch;
  return tagIndex;
}

export function resolveVoucherTransactionTags(voucher: AccountingVoucher): VoucherTransactionTags {
  const ref = voucher.referenceNo?.trim();
  if (!ref) return emptyTags();
  return ensureTagIndex().get(ref) ?? emptyTags();
}

export function voucherMatchesBranchWarehouse(
  voucher: AccountingVoucher,
  branch: string | string[],
  warehouse: string | string[],
): boolean {
  const tags = resolveVoucherTransactionTags(voucher);
  if (!matchesMultiFilter(branch, tags.branch)) return false;
  if (!matchesMultiFilter(warehouse, tags.warehouse)) return false;
  return true;
}

/** Party filter value: "all" | "customer:{id}" | "vendor:{id}" | string[] of those */
export function voucherMatchesParty(
  voucher: AccountingVoucher,
  partyId: string | string[],
): boolean {
  const selected = normalizeMultiFilter(partyId);
  if (selected.length === 0) return true;

  const tags = resolveVoucherTransactionTags(voucher);

  for (const party of selected) {
    const [type, idStr] = party.split(":");
    const id = Number(idStr);
    if (!id || Number.isNaN(id)) continue;

    if (type === "customer") {
      if (tags.customerId === id) return true;
      if (voucher.lines.some((l) => l.contactId === id)) return true;
    }

    if (type === "vendor") {
      if (tags.vendorId === id) return true;
      if (voucher.lines.some((l) => l.contactId === id)) return true;
    }
  }

  return false;
}

export function voucherMatchesDimensionFilters(
  voucher: AccountingVoucher,
  filters: {
    branch: string | string[];
    warehouse: string | string[];
    partyId: string | string[];
  },
): boolean {
  if (!voucherMatchesBranchWarehouse(voucher, filters.branch, filters.warehouse)) {
    return false;
  }
  return voucherMatchesParty(voucher, filters.partyId);
}
