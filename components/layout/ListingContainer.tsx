"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface ListingTabConfig {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface ListingContainerProps {
  title: string;
  titleIcon?: React.ComponentType<{ className?: string }>;
  metrics?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: ListingTabConfig[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  children: React.ReactNode;
}

export function ListingContainer({
  title,
  titleIcon: TitleIcon,
  metrics,
  actions,
  tabs,
  activeTab,
  onTabChange,
  children,
}: ListingContainerProps) {

  const tabList = tabs && tabs.length > 0 && (
    <TabsList>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="text-xs"
          >
            {Icon && <Icon className="w-3.5 h-3.5 mr-1.5" />}
            {tab.label}
          </TabsTrigger>
        );
      })}
    </TabsList>
  );

  const mainContent = (
    <>
      {/* Tabs navigation list if tabs is provided but children contains tab panels */}
      {tabs && tabs.length > 0 && tabList}
      
      {/* Main Listing Grid/Content */}
      {children}
    </>
  );

  return (
    <AppLayout>
      <div className="w-full space-y-5">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              {TitleIcon && <TitleIcon className="w-5 h-5 text-brand-600" />}
              {title}
            </h1>
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>

        {/* Metrics Section */}
        {metrics && metrics}

        {/* Conditional Tabs wrapper */}
        {tabs && tabs.length > 0 ? (
          <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
            {tabList}
            {children}
          </Tabs>
        ) : (
          children
        )}
      </div>
    </AppLayout>
  );
}
