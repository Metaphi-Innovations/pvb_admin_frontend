"use client";

import { ErpFormSection } from "@/components/masters/erp/ErpFormSection";
import {
  pricingSectionBodyClass,
  pricingSectionClass,
} from "./pricing-form-styles";

export function PricingFormSection({
  title,
  children,
  headerRight,
}: {
  title: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  return (
    <ErpFormSection
      title={title}
      className={pricingSectionClass}
      bodyClassName={pricingSectionBodyClass}
      headerRight={headerRight}
    >
      {children}
    </ErpFormSection>
  );
}
