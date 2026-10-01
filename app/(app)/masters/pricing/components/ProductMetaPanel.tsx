"use client";

import { pricingMetaItemClass, pricingMetaPanelClass } from "./pricing-form-styles";

export function ProductMetaPanel({
  items,
}: {
  items: { label: string; value: string | number }[];
}) {
  return (
    <div className={pricingMetaPanelClass}>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((item) => (
          <div key={item.label} className={pricingMetaItemClass}>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {item.label}
            </dt>
            <dd className="mt-0.5 truncate text-xs font-medium text-foreground">
              {item.value !== undefined && item.value !== "" ? item.value : "—"}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
