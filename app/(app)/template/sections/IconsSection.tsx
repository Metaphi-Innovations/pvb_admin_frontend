"use client";

import React from "react";
import {
  Check, AlertCircle, Info, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Search, Settings, Bell, User, LogOut, Home, BarChart3, FileText, Plus, Trash2,
  Edit, Eye, EyeOff, Download, Upload, Filter, ArrowUpDown, Calendar,
  Clock, MapPin, Phone, Mail, Package, Truck, CheckCircle2, AlertTriangle,
  Users, TrendingUp, Menu, MoreVertical, Briefcase, Wallet, FolderOpen,
  UserPlus, Building2, Laptop, Target, Calculator,
} from "lucide-react";
import {
  SectionShell, SectionBlock, PreviewFrame, DoDont, BestPractices,
  TokenUsage, AccessibilityNotes, ProductionNotes, ErpUseCase,
} from "../_components/SectionShell";

const GROUPS = {
  "HRMS actions": [
    { icon: UserPlus, name: "UserPlus", use: "Add employee / recruit" },
    { icon: Briefcase, name: "Briefcase", use: "Designation / role" },
    { icon: Building2, name: "Building2", use: "Organization / branch" },
    { icon: Clock, name: "Clock", use: "Attendance" },
    { icon: Calendar, name: "Calendar", use: "Leave / holidays" },
    { icon: Wallet, name: "Wallet", use: "Payroll / payslips" },
    { icon: FolderOpen, name: "FolderOpen", use: "Documents" },
    { icon: Laptop, name: "Laptop", use: "Assets" },
    { icon: Target, name: "Target", use: "Performance" },
    { icon: Calculator, name: "Calculator", use: "Payroll processing" },
  ],
  actions: [
    { icon: Plus, name: "Plus", use: "Create" },
    { icon: Edit, name: "Edit", use: "Edit" },
    { icon: Trash2, name: "Trash2", use: "Archive / delete" },
    { icon: Download, name: "Download", use: "Export" },
    { icon: Upload, name: "Upload", use: "Import / upload" },
    { icon: Search, name: "Search", use: "Search" },
    { icon: Filter, name: "Filter", use: "Filter" },
    { icon: ArrowUpDown, name: "ArrowUpDown", use: "Sort" },
  ],
  status: [
    { icon: Check, name: "Check", use: "Confirm" },
    { icon: CheckCircle2, name: "CheckCircle2", use: "Approved / present" },
    { icon: AlertCircle, name: "AlertCircle", use: "Warning" },
    { icon: AlertTriangle, name: "AlertTriangle", use: "Error" },
    { icon: Info, name: "Info", use: "Info" },
    { icon: X, name: "X", use: "Close / reject" },
    { icon: Eye, name: "Eye", use: "View" },
    { icon: EyeOff, name: "EyeOff", use: "Hidden" },
  ],
  navigation: [
    { icon: Home, name: "Home", use: "Home" },
    { icon: Menu, name: "Menu", use: "Menu" },
    { icon: ChevronUp, name: "ChevronUp", use: "Collapse" },
    { icon: ChevronDown, name: "ChevronDown", use: "Expand" },
    { icon: ChevronLeft, name: "ChevronLeft", use: "Back" },
    { icon: ChevronRight, name: "ChevronRight", use: "Forward" },
    { icon: MoreVertical, name: "MoreVertical", use: "Row actions" },
  ],
  shared: [
    { icon: Users, name: "Users", use: "Directory" },
    { icon: User, name: "User", use: "Profile" },
    { icon: Bell, name: "Bell", use: "Notifications" },
    { icon: Settings, name: "Settings", use: "Settings" },
    { icon: FileText, name: "FileText", use: "Letters / forms" },
    { icon: TrendingUp, name: "TrendingUp", use: "Salary revision" },
    { icon: BarChart3, name: "BarChart3", use: "Reports" },
    { icon: LogOut, name: "LogOut", use: "Exit process / logout" },
    { icon: Package, name: "Package", use: "ERP inventory" },
    { icon: Truck, name: "Truck", use: "ERP logistics" },
    { icon: MapPin, name: "MapPin", use: "Branch / field" },
    { icon: Phone, name: "Phone", use: "Contact" },
    { icon: Mail, name: "Mail", use: "Email" },
  ],
};

export default function IconsSection() {
  return (
    <SectionShell overview="Lucide React is the only icon library. Template defaults to HRMS iconography (people, attendance, leave, payroll, documents) while keeping ERP icons for cross-module reference.">
      <SectionBlock title="Tokens / library">
        <p className="text-[13px] text-muted-foreground">
          Package: <code className="font-mono text-xs text-brand-700">lucide-react</code> · Default size in nav/tables: <code className="font-mono text-xs">w-3.5 h-3.5</code> · Headers: <code className="font-mono text-xs">w-4 h-4</code> · KPI: <code className="font-mono text-xs">w-4–5</code>
        </p>
      </SectionBlock>

      <SectionBlock title="Usage">
        {Object.entries(GROUPS).map(([group, icons]) => (
          <div key={group} className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{group}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {icons.map(({ icon: Icon, name, use }) => (
                <div key={name} className="flex items-center gap-2.5 rounded-[10px] border border-border bg-white px-2.5 py-2">
                  <Icon className="w-4 h-4 text-brand-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-foreground truncate">{name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{use}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </SectionBlock>

      <SectionBlock title="Real HRMS example">
        <PreviewFrame title="HR quick actions">
          <div className="flex flex-wrap gap-2">
            {[
              { icon: UserPlus, label: "Add employee" },
              { icon: Calendar, label: "Apply leave" },
              { icon: Clock, label: "Regularize" },
              { icon: Wallet, label: "Run payroll" },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                type="button"
                className="h-9 px-3 text-xs font-medium rounded-[10px] border border-border bg-white inline-flex items-center gap-2 hover:bg-muted/40"
              >
                <Icon className="w-3.5 h-3.5 text-brand-600" />
                {label}
              </button>
            ))}
          </div>
        </PreviewFrame>
      </SectionBlock>

      <ErpUseCase
        title="Procurement / warehouse"
        description="Reuse Package, Truck, Filter, Download for GRN and stock screens. Same size rules as HRMS."
      />

      <BestPractices items={[
        "One library only — Lucide.",
        "Tint icons with brand/muted; avoid random colors.",
        "Pair icon buttons with aria-label or visible text.",
      ]} />

      <DoDont
        dos={["Use Lucide consistently", "Keep table action icons at 14–16px", "Match icon meaning to HR domain"]}
        donts={["Don't mix Material / Font Awesome", "Don't use emoji as icons", "Don't oversized 24px icons in dense tables"]}
      />

      <TokenUsage tokens={[
        { token: "w-3.5 h-3.5", use: "Nav / table / inline" },
        { token: "w-4 h-4", use: "Buttons / tabs" },
        { token: "text-brand-600", use: "Accent icons" },
        { token: "text-muted-foreground", use: "Secondary icons" },
      ]} />

      <AccessibilityNotes items={[
        "Decorative icons: aria-hidden. Interactive icon-only buttons need accessible names.",
      ]} />

      <ProductionNotes items={[
        "Template icon examples are HRMS-first. Production modules remain unchanged.",
      ]} />
    </SectionShell>
  );
}
