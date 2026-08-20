import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type { DebitNoteRecord } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import type {
  DebitNoteListQueryParams,
  CreateDirectDebitNotePayload,
  CreateDebitNoteFromPendingPayload,
  UpdateDebitNoteEwayBillPayload,
  DebitNoteConfig
} from "@/types/debit-note.types";

export function mapDebitNoteToRecord(item: any): DebitNoteRecord {
  return {
    id: item.pending_debit_note_id || item.debit_note_id || item.id,
    debitNoteNo: item.dn_number || item.debit_note_number || item.voucher_no || "—",
    debitNoteDate: item.dn_date ? new Date(item.dn_date).toISOString().split("T")[0] : "—",
    againstType: item.against_type || (item.purchase_invoice_id ? "purchase_invoice" : "standalone_adjustment"),
    sourceInvoiceId: item.purchase_invoice_id || null,
    sourceInvoiceNo: item.purchase_invoice?.invoice_no || "—",
    sourcePoId: item.purchase_order_id || null,
    sourcePoNo: item.purchase_order?.po_no || "—",
    sourceGrnNo: item.grn?.grn_no || "—",
    sourceQcNo: item.qc?.qc_no || "—",
    vendorId: item.supplier_id || null,
    vendorName: item.supplier?.supplier_name || item.supplier_name || "—",
    originalAmount: parseFloat(item.taxable_amount || "0"),
    alreadyAdjustedAmount: 0,
    taxableAmount: parseFloat(item.taxable_amount || "0"),
    gstAmount: parseFloat(item.cgst_amount || "0") + parseFloat(item.sgst_amount || "0") + parseFloat(item.igst_amount || "0"),
    currentDebitAmount: parseFloat(item.grand_total || "0"),
    balanceAfterAdjustment: 0,
    standaloneDebitAmount: parseFloat(item.grand_total || "0"),
    lineItems: item.lines?.map((line: any) => ({
      id: line.id,
      productName: line.description || "—",
      returnQty: parseFloat(line.quantity || "0"),
      unitPrice: parseFloat(line.rate || "0"),
      debitAmount: parseFloat(line.taxable_amount || "0"),
      taxPct: parseFloat(line.gst_rate || "0"),
      adjustmentLedgerId: line.ledger_id,
      adjustmentLedgerName: line.ledger?.ledger_name || "",
    })) || [],
    reason: item.remarks || item.narration || "",
    remarks: item.remarks || item.narration || "",
    attachments: item.attachments || [],
    status: item.status?.toLowerCase() || "draft",
    activity: item.activity?.map((act: any) => ({
      action: act.action || "",
      detail: act.details || act.detail || "",
      by: act.performed_by_name || act.by || "—",
      at: act.performed_at || act.at || new Date().toISOString(),
    })) || [],
    createdBy: item.created_by_name || "—",
    updatedBy: item.updated_by_name || "—",
    createdAt: item.created_at || new Date().toISOString(),
    updatedAt: item.updated_at || new Date().toISOString(),
    source: item.source_type?.toLowerCase() || "manual",
    sourceReturnId: item.purchase_return_id || undefined,
    sourceReturnNo: item.purchase_return?.return_no || undefined,
    referenceNo: item.remarks || "",
    adjustmentLedgerId: item.lines?.[0]?.ledger_id || null,
    adjustmentLedgerName: item.lines?.[0]?.ledger?.ledger_name || "",
    cgstAmount: parseFloat(item.cgst_amount || "0"),
    sgstAmount: parseFloat(item.sgst_amount || "0"),
    igstAmount: parseFloat(item.igst_amount || "0"),
    warehouse: item.warehouse?.warehouse_name || "",
    branch: item.warehouse?.warehouse_name || "",
    bankAccountId: item.bank_account_id || null,
    round_off: parseFloat(item.round_off || "0"),
    reversal_voucher_number: item.reversal?.voucher_number || null,
    reversed_at: item.reversal?.posted_at || null,
    reversed_by: item.reversal?.posted_by_name || null,
    reversal_reason: item.reversal_reason || null,
  };
}

export const DebitNoteService = {
  async getConfig(): Promise<DebitNoteConfig> {
    const response = await axiosInstance.get(API_ENDPOINTS.ACCOUNTS.DEBIT_NOTE.CONFIG);
    return response.data?.data || { approval_required: true };
  },

  async list(params?: DebitNoteListQueryParams): Promise<{ items: any[]; pagination: any }> {
    const response = await axiosInstance.get(API_ENDPOINTS.ACCOUNTS.DEBIT_NOTE.LIST, { params });
    return response.data?.data || { items: [], pagination: { total: 0, page: 1, page_size: 25 } };
  },

  async getById(id: string | number): Promise<any> {
    const response = await axiosInstance.get(API_ENDPOINTS.ACCOUNTS.DEBIT_NOTE.GET_BY_ID(id));
    return response.data?.data;
  },

  async createDirect(payload: CreateDirectDebitNotePayload): Promise<any> {
    const response = await axiosInstance.post(API_ENDPOINTS.ACCOUNTS.DEBIT_NOTE.CREATE_DIRECT, payload);
    return response.data?.data;
  },

  async updateDraft(id: string | number, payload: Partial<CreateDirectDebitNotePayload>): Promise<any> {
    const response = await axiosInstance.patch(API_ENDPOINTS.ACCOUNTS.DEBIT_NOTE.UPDATE(id), payload);
    return response.data?.data;
  },

  async updateEwayBill(id: string | number, payload: UpdateDebitNoteEwayBillPayload): Promise<any> {
    const response = await axiosInstance.patch(API_ENDPOINTS.ACCOUNTS.DEBIT_NOTE.EWAY_BILL(id), payload);
    return response.data?.data;
  },

  async submit(id: string | number, payload: { approver_id: string; remarks?: string }): Promise<any> {
    const response = await axiosInstance.post(API_ENDPOINTS.ACCOUNTS.DEBIT_NOTE.SUBMIT(id), payload);
    return response.data?.data;
  },

  async approve(id: string | number): Promise<any> {
    const response = await axiosInstance.post(API_ENDPOINTS.ACCOUNTS.DEBIT_NOTE.APPROVE(id));
    return response.data?.data;
  },

  async reject(id: string | number, payload: { rejection_reason: string }): Promise<any> {
    const response = await axiosInstance.post(API_ENDPOINTS.ACCOUNTS.DEBIT_NOTE.REJECT(id), payload);
    return response.data?.data;
  },

  async post(id: string | number): Promise<any> {
    const response = await axiosInstance.post(API_ENDPOINTS.ACCOUNTS.DEBIT_NOTE.POST(id));
    return response.data?.data;
  },

  async cancel(id: string | number, payload: { reason: string }): Promise<any> {
    const response = await axiosInstance.post(API_ENDPOINTS.ACCOUNTS.DEBIT_NOTE.CANCEL(id), payload);
    return response.data?.data;
  },

  async reverse(id: string | number, payload: { reason: string; reversal_date?: string }): Promise<any> {
    const response = await axiosInstance.post(API_ENDPOINTS.ACCOUNTS.DEBIT_NOTE.REVERSE(id), payload);
    return response.data?.data;
  },

  async listPending(params?: { page?: number; page_size?: number; search?: string; status?: string }): Promise<{ items: any[]; pagination: any }> {
    const response = await axiosInstance.get(API_ENDPOINTS.ACCOUNTS.DEBIT_NOTE.PENDING, { params });
    return response.data?.data || { items: [], pagination: { total: 0, page: 1, page_size: 25 } };
  },

  async getPendingById(id: string | number): Promise<any> {
    const response = await axiosInstance.get(API_ENDPOINTS.ACCOUNTS.DEBIT_NOTE.PENDING_BY_ID(id));
    return response.data?.data;
  },

  async createFromPending(pendingId: string | number, payload: CreateDebitNoteFromPendingPayload): Promise<any> {
    const response = await axiosInstance.post(API_ENDPOINTS.ACCOUNTS.DEBIT_NOTE.CREATE_FROM_PENDING(pendingId), payload);
    return response.data?.data;
  },
};
