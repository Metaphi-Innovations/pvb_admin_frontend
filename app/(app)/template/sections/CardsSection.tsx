import React from "react";
import { KPICard } from "@/components/ui/KPICard";
import { TrendingUp, Package, ShoppingBag } from "lucide-react";

export default function CardsSection() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">KPI Cards</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            title="Total Sales"
            value="₹48.2L"
            subtitle="This month"
            change={{ value: 12.4 }}
            icon={TrendingUp}
            accent="orange"
          />
          <KPICard
            title="Pending Orders"
            value="87"
            subtitle="Awaiting dispatch"
            change={{ value: -2.1 }}
            icon={ShoppingBag}
            accent="amber"
          />
          <KPICard
            title="Inventory"
            value="24,810"
            subtitle="Units in stock"
            change={{ value: 5.3 }}
            icon={Package}
            accent="leaf"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Used for displaying key metrics and KPIs. Supports icons, change indicators, and accent colors.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Data Cards</h3>
        <div className="space-y-4">
          {[
            { title: "Customer Card", desc: "Basic customer information card" },
            { title: "Product Card", desc: "Product details with image and actions" },
            { title: "Order Card", desc: "Order summary with status" },
          ].map((card) => (
            <div key={card.title} className="bg-white border border-border rounded-card p-5 shadow-card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{card.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  [icon]
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Card Structure</h3>
        <div className="bg-muted/20 border border-border rounded-lg p-6">
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-lg bg-brand-100 border border-brand-200 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-brand-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Card Header</p>
                <p className="text-muted-foreground">Subtitle or description</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">Value</p>
                <p className="text-xs text-emerald-600">+12.4%</p>
              </div>
            </div>
            <div className="bg-white rounded border border-border p-3">
              <p className="text-muted-foreground">Card content area</p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-muted-foreground">Footer info</p>
              <button className="text-xs font-medium text-brand-600 hover:underline">Action</button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Card Best Practices</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• Consistent padding and border radius</p>
          <p>• Shadow for elevation and hierarchy</p>
          <p>• Icon + text for visual clarity</p>
          <p>• Hover state for interactivity</p>
          <p>• Content organized from top to bottom</p>
        </div>
      </div>
    </div>
  );
}
