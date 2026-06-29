"use client";

import React from "react";
import { EmptySearch, EmptyModuleState } from "@/components/ui/EmptyState";

interface EmptyStateProps {
  isSearch: boolean;
  onClearFilters?: () => void;
  emptyMessage?: string;
  onAdd?: () => void;
}

export function EmptyState({
  isSearch,
  onClearFilters,
  emptyMessage = "records",
  onAdd,
}: EmptyStateProps) {
  if (isSearch) {
    return <EmptySearch onClear={onClearFilters} />;
  }

  if (!emptyMessage) {
    return null;
  }

  return <EmptyModuleState module={emptyMessage} onAdd={onAdd} />;
}
