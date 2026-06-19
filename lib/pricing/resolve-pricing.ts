/**
 * Standard company pricing resolution.
 *
 * Priority:
 * - Purchase: Vendor Product Price → Pricing Master CP
 * - Sales: Customer Product Price → Pricing Master DP/RP (by customer type)
 *
 * MRP is always sourced from Pricing Master only.
 */

import type { Product } from "@/app/(app)/masters/products/product-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import {
  loadPricingRecords,
  type PricingRecord,
} from "@/app/(app)/masters/pricing/pricing-data";
import { getVendorById } from "@/app/(app)/masters/vendors/vendor-data";
import type { VendorProductMapping } from "@/app/(app)/masters/vendors/vendor-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import type { CustomerProductMapping } from "@/app/(app)/masters/customers/customer-data";

export type PriceSource = "vendor_override" | "customer_override" | "pricing_master";

export interface ResolvedPrice {
  amount: number;
  source: PriceSource;
  mrp: number;
}

export interface StandardPricing {
  costPrice: number;
  distributorPrice: number;
  retailPrice: number;
  mrp: number;
}

export function findProductRef(key: string | number): Product | undefined {
  const products = loadProducts();
  if (typeof key === "number") {
    return products.find((p) => p.id === key);
  }
  const s = String(key).trim();
  if (!s) return undefined;
  return products.find(
    (p) => p.productId === s || p.sku === s || String(p.id) === s,
  );
}

export function getActivePricingForProduct(
  productId: number,
): PricingRecord | undefined {
  return loadPricingRecords().find(
    (r) => r.productId === productId && r.status === "active",
  );
}

export function getStandardPricing(productId: number): StandardPricing | null {
  const record = getActivePricingForProduct(productId);
  if (!record) return null;
  return {
    costPrice: record.costPrice,
    distributorPrice: record.distributorPrice,
    retailPrice: record.retailPrice,
    mrp: record.mrp,
  };
}

export function getStandardMrp(productId: number): number {
  return getActivePricingForProduct(productId)?.mrp ?? 0;
}

function matchesVendorProduct(
  mapping: VendorProductMapping,
  product: Product,
): boolean {
  return (
    mapping.productId === product.sku ||
    mapping.productId === String(product.id) ||
    (!!mapping.sku && mapping.sku === product.sku)
  );
}

function matchesCustomerProduct(
  mapping: CustomerProductMapping,
  product: Product,
): boolean {
  return (
    mapping.productId === product.sku ||
    mapping.productId === String(product.id) ||
    (!!mapping.sku && mapping.sku === product.sku)
  );
}

/** Retail-oriented customer types use RP; others use DP from Pricing Master. */
export function customerUsesRetailPrice(customerType: string): boolean {
  const t = customerType.toLowerCase();
  return t === "retailer" || t === "farmer" || t === "individual";
}

/**
 * Purchase cost: Vendor Product Price → Pricing Master CP
 */
export function resolvePurchaseCostPrice(
  productKey: string | number,
  vendorId?: number,
): ResolvedPrice {
  const product = findProductRef(productKey);
  if (!product) {
    return { amount: 0, source: "pricing_master", mrp: 0 };
  }

  const pricing = getActivePricingForProduct(product.id);
  const standardMrp = pricing?.mrp ?? 0;

  if (vendorId) {
    const vendor = getVendorById(vendorId);
    const mapping = vendor?.vendorProducts?.find(
      (vp) => vp.status === "Active" && matchesVendorProduct(vp, product),
    );
    if (mapping?.price != null && mapping.price > 0) {
      return {
        amount: mapping.price,
        source: "vendor_override",
        mrp: standardMrp,
      };
    }
  }

  return {
    amount: pricing?.costPrice ?? 0,
    source: "pricing_master",
    mrp: standardMrp,
  };
}

/**
 * Sales unit price: Customer Product Price → Pricing Master DP/RP
 */
export function resolveSalesUnitPrice(
  productKey: string | number,
  customerId?: number,
): ResolvedPrice {
  const product = findProductRef(productKey);
  if (!product) {
    return { amount: 0, source: "pricing_master", mrp: 0 };
  }

  const pricing = getActivePricingForProduct(product.id);
  const standardMrp = pricing?.mrp ?? 0;

  if (customerId) {
    const customer = loadCustomers().find((c) => c.id === customerId);
    if (customer) {
      const mappings =
        customer.customerProducts ?? customer.products ?? [];
      const mapping = mappings.find(
        (cp) => cp.status === "Active" && matchesCustomerProduct(cp, product),
      );
      if (mapping?.price != null && mapping.price > 0) {
        return {
          amount: mapping.price,
          source: "customer_override",
          mrp: standardMrp,
        };
      }

      const useRetail = customerUsesRetailPrice(customer.customerType);
      const amount = useRetail
        ? (pricing?.retailPrice ?? 0)
        : (pricing?.distributorPrice ?? 0);
      return { amount, source: "pricing_master", mrp: standardMrp };
    }
  }

  return {
    amount: pricing?.distributorPrice ?? 0,
    source: "pricing_master",
    mrp: standardMrp,
  };
}
