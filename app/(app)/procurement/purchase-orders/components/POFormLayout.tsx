"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FormContainer } from "@/components/layout/FormContainer";

interface POFormLayoutProps {
  mode: "create" | "edit" | "view";
  poNumber: string;
  status?: string;
  backHref?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
  onSave?: () => void;
  saveLabel?: string;
}

export function POFormLayout({
  mode,
  poNumber,
  backHref,
  children,
  footer,
  headerActions,
}: POFormLayoutProps) {
  const router = useRouter();
  const title = mode === "create" ? "Create Purchase Order" : mode === "edit" ? "Edit Purchase Order" : "Purchase Order";
  const defaultBack = mode === "create" ? "/procurement/purchase-orders" : backHref ?? "/procurement/purchase-orders";

  return (
    <FormContainer
      title={title}
      description={poNumber ? `PO Number: ${poNumber}` : "New Purchase Order"}
      onBack={() => router.push(defaultBack)}
      actions={
        <div className="flex items-center gap-2">
          {headerActions}
          {footer}
        </div>
      }
      noCard={true}
    >
      {children}
    </FormContainer>
  );
}
