"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FormContainer } from "@/components/layout/FormContainer";

interface PRFormLayoutProps {
  mode: "create" | "edit" | "view";
  prNumber: string;
  status?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
}

export function PRFormLayout({
  mode,
  prNumber,
  children,
  footer,
  headerActions,
}: PRFormLayoutProps) {
  const router = useRouter();
  const title =
    mode === "create"
      ? "Add Purchase Request"
      : mode === "edit"
        ? "Edit Purchase Request"
        : "Purchase Request";
  const description =
    mode === "create"
      ? "Procurement > Purchase Request > Add"
      : mode === "edit"
        ? "Procurement > Purchase Request > Edit"
        : prNumber
          ? `Procurement > Purchase Request > ${prNumber}`
          : "Procurement > Purchase Request";

  return (
    <FormContainer
      title={title}
      description={description}
      compact
      onBack={() => router.push("/procurement/purchase-requests")}
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
