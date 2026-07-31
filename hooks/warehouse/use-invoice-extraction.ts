"use client";

import { useMutation } from "@tanstack/react-query";
import {
  InvoiceExtractionService,
  type InvoiceExtractionResult,
} from "@/services/invoice-extraction.service";

export type ExtractInvoiceInput = {
  file: File;
  purchaseOrderId?: string | null;
};

export function useExtractInvoice() {
  return useMutation({
    mutationFn: ({ file, purchaseOrderId }: ExtractInvoiceInput) =>
      InvoiceExtractionService.extractInvoice(file, purchaseOrderId),
  });
}

export type { InvoiceExtractionResult };
