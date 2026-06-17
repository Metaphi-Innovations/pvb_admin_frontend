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
  onSave?: () => void;
  saveLabel?: string;
}

export function PRFormLayout({
  mode,
  prNumber,
  children,
  footer,
  headerActions,
}: PRFormLayoutProps) {
  const router = useRouter();
  const title = mode === "create" ? "Create Purchase Request" : mode === "edit" ? "Edit Purchase Request" : "Purchase Request";

  return (
    <FormContainer
      title={title}
      description={prNumber ? `PR Number: ${prNumber}` : "New Purchase Request"}
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
