"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface FormTabConfig {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface FormContainerProps {
  title: string;
  description?: string;
  onBack?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  tabs?: FormTabConfig[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  noCard?: boolean;
  /** Tighter header and card padding for dense full-page forms */
  compact?: boolean;
}

export function FormContainer({
  title,
  description,
  onBack,
  onCancel,
  cancelLabel = "Discard",
  actions,
  children,
  tabs,
  activeTab,
  onTabChange,
  noCard = false,
  compact = false,
}: FormContainerProps) {
  const tabList = tabs && tabs.length > 0 && (
    <TabsList className="bg-muted/50 p-0.5 border border-border/60 rounded-xl inline-flex h-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="text-xs font-semibold px-4 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-700"
          >
            {Icon && <Icon className="w-3.5 h-3.5 mr-1.5" />}
            {tab.label}
          </TabsTrigger>
        );
      })}
    </TabsList>
  );

  return (
    <AppLayout>
      <div className={compact ? "w-full space-y-3" : "w-full space-y-6"}>
        {/* Header Block */}
        <div
          className={
            compact
              ? "flex items-center justify-between border-b pb-2.5"
              : "flex items-center justify-between border-b pb-4"
          }
        >
          <div className="flex items-center gap-3">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-muted"
                onClick={onBack}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-base font-bold text-foreground">{title}</h1>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          
          {/* Header Action Controls */}
          {(onCancel || actions) && (
            <div className="flex items-center gap-2">
              {onCancel && (
                <Button
                  variant="outline"
                  className="h-9 text-xs font-semibold rounded-lg"
                  onClick={onCancel}
                >
                  {cancelLabel}
                </Button>
              )}
              {actions}
            </div>
          )}
        </div>

        {/* Conditional Tabs and Single Card wrapper */}
        {tabs && tabs.length > 0 ? (
          <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
            {tabList}
            {noCard ? (
              children
            ) : (
              <div
                className={
                  compact
                    ? "bg-white rounded-xl border border-border p-4 shadow-sm"
                    : "bg-white rounded-xl border border-border p-6 shadow-sm space-y-6"
                }
              >
                {children}
              </div>
            )}
          </Tabs>
        ) : noCard ? (
          children
        ) : (
          <div
            className={
              compact
                ? "bg-white rounded-xl border border-border p-4 shadow-sm"
                : "bg-white rounded-xl border border-border p-6 shadow-sm space-y-6"
            }
          >
            {children}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

