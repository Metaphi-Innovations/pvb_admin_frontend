"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Plus, FileText, Truck, CreditCard, UserPlus, Wheat,
  type LucideIcon,
} from "lucide-react";

const QUICK_ACTIONS: { label: string; icon: LucideIcon; href: string; accent: string }[] = [
  { label: "New Order",       icon: Plus,      href: "/sales/orders/new",        accent: "bg-brand-50 text-brand-600 border-brand-200"  },
  { label: "New Invoice",     icon: FileText,  href: "/sales/invoices/new",       accent: "bg-sage-50 text-sage-600 border-sage-200"    },
  { label: "Dispatch",        icon: Truck,     href: "/sales/dispatch/new",       accent: "bg-blue-50 text-blue-600 border-blue-200"    },
  { label: "Collection",      icon: CreditCard,href: "/sales/collections/new",    accent: "bg-amber-50 text-amber-600 border-amber-200" },
  { label: "Add Farmer",      icon: Wheat,     href: "/database/farmer",          accent: "bg-olive-50 text-olive-600 border-olive-200" },
  { label: "Add Employee",    icon: UserPlus,  href: "/hr/employees/new",         accent: "bg-purple-50 text-purple-600 border-purple-200"},
];

export function QuickActions() {
  return (
    <div className="bg-white rounded-card border border-border shadow-card p-4">
      <p className="text-card-title text-foreground mb-3">Quick Actions</p>
      <div className="grid grid-cols-3 gap-2">
        {QUICK_ACTIONS.map(action => (
          <a
            key={action.label}
            href={action.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border",
              "text-center transition-all duration-150 hover:shadow-md hover:-translate-y-0.5",
              action.accent,
            )}
          >
            <action.icon className="w-5 h-5" strokeWidth={1.8} />
            <span className="text-[11px] font-semibold leading-tight">{action.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
