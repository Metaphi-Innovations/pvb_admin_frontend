"use client";

import { useMutation } from "@tanstack/react-query";
import {
  InvoiceExtractionService,
  type InvoiceExtractionResult,
} from "@/services/invoice-extraction.service";

export function useExtractInvoice() {
  return useMutation({
    mutationFn: (file: File) => InvoiceExtractionService.extractInvoice(file),
  });
}

export type { InvoiceExtractionResult };
