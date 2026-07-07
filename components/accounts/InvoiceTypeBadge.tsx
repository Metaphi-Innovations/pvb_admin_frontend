import { cn } from "@/lib/utils";
import {
  INVOICE_TYPE_LABELS,
  type InvoiceDocumentType,
} from "@/lib/accounts/invoice-type";

export function InvoiceTypeBadge({ type }: { type: InvoiceDocumentType }) {
  const isStockTransfer = type === "stock_transfer";
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md border px-1.5 text-[10px] font-semibold whitespace-nowrap",
        isStockTransfer
          ? "border-navy-200 bg-navy-50 text-navy-700"
          : "border-brand-200 bg-brand-50 text-brand-700",
      )}
    >
      {INVOICE_TYPE_LABELS[type]}
    </span>
  );
}
