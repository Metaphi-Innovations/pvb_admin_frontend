/**
 * Offline validation for Product Sales / Stock in Hand posting resolution.
 * Run: npx tsx scripts/validate-system-ledger-posting.ts
 */

import { SYSTEM_COA_NODES } from "../app/(app)/accounts/masters/coa-seed-nodes";
import type { ChartOfAccount } from "../app/(app)/accounts/data";
import {
  findLegacyShadowSystemLedgers,
  missingSystemLedgerError,
  planSystemAliasBackfill,
  resolveApprovedSystemLedger,
  resolveApprovedSystemLedgerDetailed,
  SYSTEM_CONTROLLED_MAPPING_KEYS,
} from "../lib/accounts/system-ledger-resolver";
import {
  resolveServiceInvoiceRevenueLedger,
  SERVICE_INCOME_LEDGER_NAME,
} from "../lib/accounts/ledger-mappings";
import {
  isLockedSystemLedger,
  MANDATORY_SYSTEM_LEDGERS,
} from "../app/(app)/accounts/masters/chart-of-accounts/coa-statutory-ledgers";
import { canDeleteLedger, canEditLedger } from "../app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";

function countByName(records: ChartOfAccount[], name: string): number {
  const n = name.trim().toLowerCase();
  return records.filter(
    (r) => r.nodeLevel === "ledger" && r.accountName.trim().toLowerCase() === n,
  ).length;
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function main() {
  const records = SYSTEM_COA_NODES.map((r) => ({ ...r }));

  const productSales = resolveApprovedSystemLedger("PRODUCT_SALES", records, {
    backfillAlias: false,
  });
  const stockInHand = resolveApprovedSystemLedger("STOCK_IN_HAND", records, {
    backfillAlias: false,
  });

  assert(!!productSales, "PRODUCT_SALES must resolve from statutory seed");
  assert(!!stockInHand, "STOCK_IN_HAND must resolve from statutory seed");
  assert(
    productSales!.accountCode === MANDATORY_SYSTEM_LEDGERS.productSales.code,
    "PRODUCT_SALES code mismatch",
  );
  assert(
    stockInHand!.accountCode === MANDATORY_SYSTEM_LEDGERS.stockInHand.code,
    "STOCK_IN_HAND code mismatch",
  );
  assert(productSales!.isSystem === true, "PRODUCT_SALES must be isSystem");
  assert(stockInHand!.isSystem === true, "STOCK_IN_HAND must be isSystem");
  assert(
    (productSales!.alias ?? "").toLowerCase() === "sys:product_sales",
    "PRODUCT_SALES seed alias must be sys:PRODUCT_SALES",
  );
  assert(
    (stockInHand!.alias ?? "").toLowerCase() === "sys:stock_in_hand",
    "STOCK_IN_HAND seed alias must be sys:STOCK_IN_HAND",
  );

  for (let i = 0; i < 3; i++) {
    const ps = resolveApprovedSystemLedger("PRODUCT_SALES", records, { backfillAlias: false });
    const si = resolveApprovedSystemLedger("STOCK_IN_HAND", records, { backfillAlias: false });
    assert(ps?.id === productSales!.id, "PRODUCT_SALES id must be stable across resolutions");
    assert(si?.id === stockInHand!.id, "STOCK_IN_HAND id must be stable across resolutions");
  }

  const withShadows: ChartOfAccount[] = [
    ...records,
    {
      ...productSales!,
      id: 90001,
      accountCode: "LED-90001",
      accountName: "General",
      isSystem: false,
      isSystemGenerated: true,
      alias: "",
      ledgerKind: "GENERIC",
    },
    {
      ...productSales!,
      id: 90002,
      accountCode: "LED-90002",
      accountName: "General Sales",
      isSystem: false,
      alias: "",
      ledgerKind: "GENERIC",
    },
    {
      ...stockInHand!,
      id: 90003,
      accountCode: "LED-90003",
      accountName: "Inventory / Stock-in-Hand",
      isSystem: false,
      alias: "",
      ledgerKind: "GENERIC",
    },
  ];

  const ps2 = resolveApprovedSystemLedger("PRODUCT_SALES", withShadows, { backfillAlias: false });
  const si2 = resolveApprovedSystemLedger("STOCK_IN_HAND", withShadows, { backfillAlias: false });
  assert(ps2?.id === productSales!.id, "Must not pick General / General Sales");
  assert(si2?.id === stockInHand!.id, "Must not pick Inventory / Stock-in-Hand");

  const withoutProductSales = records.filter((r) => r.id !== productSales!.id);
  assert(
    resolveApprovedSystemLedger("PRODUCT_SALES", withoutProductSales, { backfillAlias: false }) ===
      null,
    "Missing PRODUCT_SALES must fail closed",
  );
  assert(
    missingSystemLedgerError("PRODUCT_SALES").includes("PRODUCT_SALES"),
    "Missing PRODUCT_SALES error text",
  );
  const withoutStock = records.filter((r) => r.id !== stockInHand!.id);
  assert(
    resolveApprovedSystemLedger("STOCK_IN_HAND", withoutStock, { backfillAlias: false }) === null,
    "Missing STOCK_IN_HAND must fail closed",
  );
  assert(
    missingSystemLedgerError("STOCK_IN_HAND").includes("STOCK_IN_HAND"),
    "Missing STOCK_IN_HAND error text",
  );

  assert(SYSTEM_CONTROLLED_MAPPING_KEYS.sales_revenue === "PRODUCT_SALES", "sales_revenue map");
  assert(
    SYSTEM_CONTROLLED_MAPPING_KEYS.purchase_inventory === "STOCK_IN_HAND",
    "purchase_inventory map",
  );
  assert(SYSTEM_CONTROLLED_MAPPING_KEYS.stock_inventory === "STOCK_IN_HAND", "stock_inventory map");

  const beforePs = countByName(withShadows, "Product Sales");
  const beforeSi = countByName(withShadows, "Stock in Hand");
  const beforeGeneral = countByName(withShadows, "General");
  const beforeInvNamed = countByName(withShadows, "Inventory / Stock-in-Hand");

  resolveApprovedSystemLedger("PRODUCT_SALES", withShadows, { backfillAlias: false });
  resolveApprovedSystemLedger("STOCK_IN_HAND", withShadows, { backfillAlias: false });
  assert(countByName(withShadows, "Product Sales") === beforePs, "Product Sales count unchanged");
  assert(countByName(withShadows, "Stock in Hand") === beforeSi, "Stock in Hand count unchanged");
  assert(countByName(withShadows, "General") === beforeGeneral, "General count unchanged");
  assert(
    countByName(withShadows, "Inventory / Stock-in-Hand") === beforeInvNamed,
    "Inventory / Stock-in-Hand count unchanged",
  );

  const serviceGeneral = withShadows.find((r) => r.id === 90001)!;
  assert(serviceGeneral.id !== productSales!.id, "Service/legacy General ≠ Product Sales");

  // Product Sales / Stock in Hand share the locked system-ledger policy.
  assert(isLockedSystemLedger(productSales!), "Product Sales must be locked");
  assert(isLockedSystemLedger(stockInHand!), "Stock in Hand must remain locked");
  assert(!canEditLedger(productSales!, records), "Product Sales must not be editable");
  assert(!canDeleteLedger(productSales!, records), "Product Sales must not be deletable");
  assert(!canEditLedger(stockInHand!, records), "Stock in Hand edit lock unchanged");

  // Correct sys:* alias → no write planned.
  const correctPlan = planSystemAliasBackfill(productSales!, "PRODUCT_SALES");
  assert(!correctPlan.shouldWrite && !correctPlan.conflict, "Correct alias must be no-op");

  // Empty alias → may stamp once (plan only; no storage in this offline path).
  const emptyAliasPs = { ...productSales!, alias: "" };
  const emptyPlan = planSystemAliasBackfill(emptyAliasPs, "PRODUCT_SALES");
  assert(emptyPlan.shouldWrite === true, "Empty alias may be stamped once");
  assert(emptyPlan.nextAlias === "sys:PRODUCT_SALES", "Empty stamp uses sys:PRODUCT_SALES");

  // Conflicting non-empty alias → resolve by seed ID/code, do not mutate, do not create.
  const conflictRecords = records.map((r) =>
    r.id === productSales!.id ? { ...r, alias: "user-custom-alias" } : { ...r },
  );
  const beforeAlias = conflictRecords.find((r) => r.id === productSales!.id)!.alias;
  const conflictResult = resolveApprovedSystemLedgerDetailed("PRODUCT_SALES", conflictRecords, {
    backfillAlias: true,
  });
  assert(conflictResult.ledger?.id === productSales!.id, "Conflict still resolves seed ID 159");
  assert(conflictResult.wroteAlias === false, "Conflict must not write alias");
  assert(!!conflictResult.aliasMetadataConflict, "Conflict must return diagnostic");
  assert(
    conflictRecords.find((r) => r.id === productSales!.id)!.alias === beforeAlias,
    "Conflicting alias must not be overwritten",
  );
  assert(
    countByName(conflictRecords, "Product Sales") === 1,
    "Conflict must not create another Product Sales",
  );

  const siConflictRecords = records.map((r) =>
    r.id === stockInHand!.id ? { ...r, alias: "legacy-inv-alias" } : { ...r },
  );
  const siBefore = siConflictRecords.find((r) => r.id === stockInHand!.id)!.alias;
  const siConflict = resolveApprovedSystemLedgerDetailed("STOCK_IN_HAND", siConflictRecords, {
    backfillAlias: true,
  });
  assert(siConflict.ledger?.id === stockInHand!.id, "SI conflict still resolves seed ID 114");
  assert(siConflict.wroteAlias === false, "SI conflict must not write");
  assert(
    siConflictRecords.find((r) => r.id === stockInHand!.id)!.alias === siBefore,
    "SI conflicting alias must not be overwritten",
  );

  // Service Invoice revenue — Service Income only; never General / Product Sales / auto-create.
  {
    const serviceRevenue = records.find((r) => r.accountName === "Service Revenue");
    const sales = records.find((r) => r.accountName === "Sales");
    assert(!!serviceRevenue && !!sales, "Service Revenue / Sales groups required");

    const beforeLen = records.length;
    assert(
      resolveServiceInvoiceRevenueLedger({ records }) === null,
      "Missing Service Income must fail closed",
    );
    assert(records.length === beforeLen, "Service resolve must not create ledgers");

    const withServiceIncome: ChartOfAccount[] = [
      ...records,
      {
        ...productSales!,
        id: 88001,
        accountCode: "LED-88001",
        accountName: SERVICE_INCOME_LEDGER_NAME,
        alias: "",
        isSystem: false,
        isSystemGenerated: true,
        ledgerKind: "GENERIC",
        parentAccountId: serviceRevenue!.id,
        parentAccount: "Service Revenue",
      },
      {
        ...productSales!,
        id: 88002,
        accountCode: "LED-88002",
        accountName: "General",
        alias: "",
        isSystem: false,
        isSystemGenerated: true,
        ledgerKind: "GENERIC",
        parentAccountId: sales!.id,
        parentAccount: "Sales",
      },
    ];
    const svc = resolveServiceInvoiceRevenueLedger({ records: withServiceIncome });
    assert(svc?.id === 88001, "Default Service Income must resolve");
    assert(svc?.id !== productSales!.id, "Must never use Product Sales");
    assert(
      resolveServiceInvoiceRevenueLedger({
        records: withServiceIncome,
        selectedLedgerId: 88002,
      }) === null,
      "Selected General must be rejected",
    );
    assert(
      resolveServiceInvoiceRevenueLedger({
        records: withServiceIncome,
        selectedLedgerId: productSales!.id,
      }) === null,
      "Selected Product Sales must be rejected",
    );
    assert(
      withServiceIncome.filter((r) => r.accountName === "General").length === 1,
      "General count unchanged (no auto-create)",
    );
  }

  const legacy = findLegacyShadowSystemLedgers(withShadows);
  console.log("Legacy shadow ledgers discovered:", legacy.length);
  for (const l of legacy) {
    console.log(`  - #${l.id} ${l.accountName} (${l.accountCode}): ${l.reason}`);
  }

  console.log("OK — PRODUCT_SALES id=", productSales!.id, "code=", productSales!.accountCode);
  console.log("OK — STOCK_IN_HAND id=", stockInHand!.id, "code=", stockInHand!.accountCode);
  console.log("Duplicate counts — Product Sales:", beforePs, "Stock in Hand:", beforeSi);
  console.log("All system-ledger posting integrity checks passed.");
}

main();
