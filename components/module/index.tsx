/**
 * Dharitri Sutra — canonical module UI patterns.
 * Import from here in feature modules instead of bespoke page shells.
 */

export { PageHeader as ModulePageHeader, SectionHeader, CardHeader } from "@/components/ui/PageHeader";
export { DataTable as ModuleDataTable, type Column as ModuleColumn } from "@/components/ui/DataTable";
export { StatusBadge as ModuleStatusBadge, StatusPill as ModuleStatusPill } from "@/components/ui/StatusBadge";
export { EmptyState as ModuleEmptyState, EmptyModuleState, EmptySearch } from "@/components/ui/EmptyState";
export { PhoneInput, validatePhoneNumber, formatPhoneDisplay, PHONE_COUNTRY_CODES } from "@/components/ui/PhoneInput";
export { EntityFormLayout, EntityFormSection, EntityFormField } from "@/components/module/EntityFormLayout";
export { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
export { ModuleSurface } from "@/components/module/ModuleSurface";
