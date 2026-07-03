"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FormContainer } from "@/components/layout/FormContainer";
import { purchaseReturnListHref } from "../purchase-return-utils";

interface PReturnFormLayoutProps {
  mode: "create" | "edit" | "view";
  returnNumber: string;
  backHref?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function PReturnFormLayout({
  mode,
  returnNumber,
  backHref,
  children,
  footer,
}: PReturnFormLayoutProps) {
  const router = useRouter();
  const title =
    mode === "create"
      ? "Create Purchase Return"
      : mode === "edit"
        ? "Edit Purchase Return"
        : "Purchase Return";
  const description =
    mode === "create"
      ? "Procurement > Purchase Order > Purchase Return > Create"
      : mode === "edit"
        ? "Procurement > Purchase Order > Purchase Return > Edit"
        : returnNumber
          ? `Procurement > Purchase Order > Purchase Return > ${returnNumber}`
          : "Procurement > Purchase Order > Purchase Return";
  const defaultBack = backHref ?? purchaseReturnListHref();

  return (
    <FormContainer
      title={title}
      description={description}
      onBack={() => router.push(defaultBack)}
      actions={footer}
      noCard
      compact
    >
      {children}
    </FormContainer>
  );
}
