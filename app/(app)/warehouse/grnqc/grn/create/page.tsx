"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, Send, Calendar, Check, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { MOCK_POS, saveGrnRecord, getGrnRecords } from "../mock-data";
import { GrnItem, GrnBatch, GrnRecord, GrnStatus } from "../types";
import { cn } from "@/lib/utils";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Field, TextField, FormSection } from "@/components/ui/FormFields";
import { FormContainer } from "@/components/layout/FormContainer";

export default function GenerateGrnPage() {
  const router = useRouter();

  // Header Info
  const [grnNo, setGrnNo] = useState("");
  const [vendor, setVendor] = useState("");
  const [selectedPoNos, setSelectedPoNos] = useState<string[]>([]);
  const [warehouse, setWarehouse] = useState("Central Warehouse");
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split("T")[0]);

  // Dynamic lists
  const [items, setItems] = useState<GrnItem[]>([]);
  const [batches, setBatches] = useState<GrnBatch[]>([]);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Generate Unique GRN Code on Load
  useEffect(() => {
    const existing = getGrnRecords();
    const nextNum = existing.length + 1;
    setGrnNo(`GRN-2024-${nextNum.toString().padStart(3, "0")}`);
  }, []);

  // Vendor list based on Mock POs
  const vendors = useMemo(() => {
    const unique = new Set(MOCK_POS.map((po) => po.vendorName));
    return Array.from(unique);
  }, []);

  // POs filtered by selected vendor
  const availablePos = useMemo(() => {
    if (!vendor) return [];
    return MOCK_POS.filter((po) => po.vendorName === vendor);
  }, [vendor]);

  // Sync Vendor Selection
  const handleVendorChange = (selectedVendor: string) => {
    setVendor(selectedVendor);
    setSelectedPoNos([]);
    setItems([]);
    setBatches([]);
  };

  // Sync PO Selection
  const handlePoChange = (poNums: string[]) => {
    setSelectedPoNos(poNums);
    const pos = MOCK_POS.filter((p) => poNums.includes(p.poNumber));
    if (pos.length > 0) {
      // Map ordered products to items detail list (keeping them separated by PO)
      const listItems: GrnItem[] = [];
      pos.forEach((po) => {
        po.items.forEach((it) => {
          listItems.push({
            productId: it.productId,
            productName: it.productName,
            productCode: it.productCode,
            orderedQty: it.orderedQty,
            receivedQty: it.orderedQty,
            poNumber: po.poNumber,
          });
        });
      });
      setItems(listItems);

      // Set single default empty batch row using first product
      if (listItems.length > 0) {
        setBatches([
          {
            productId: listItems[0].productId,
            productName: listItems[0].productName,
            batchNumber: "",
            mfgDate: "",
            expDate: "",
            quantity: listItems[0].receivedQty,
            poNumber: listItems[0].poNumber,
          },
        ]);
      } else {
        setBatches([]);
      }
    } else {
      setItems([]);
      setBatches([]);
    }
  };

  // Handle updates to item received quantities
  const handleItemQtyChange = (productId: string, poNumber: string, val: string) => {
    const qty = Math.max(0, parseInt(val) || 0);
    setItems((prev) =>
      prev.map((it) => (it.productId === productId && it.poNumber === poNumber ? { ...it, receivedQty: qty } : it))
    );
  };

  // Add empty batch row
  const addBatchRow = () => {
    if (items.length === 0) return;

    if (batches.length > 0) {
      const lastBatch = batches[batches.length - 1];
      if (!lastBatch.productId || !lastBatch.batchNumber || lastBatch.quantity <= 0) {
        setBatchError("Please complete the current batch row before adding another.");
        return;
      }
    }

    setBatchError(null);
    setBatches((prev) => [
      ...prev,
      {
        productId: items[0].productId,
        productName: items[0].productName,
        batchNumber: "",
        mfgDate: "",
        expDate: "",
        quantity: 0,
        poNumber: items[0].poNumber,
      },
    ]);
  };

  // Remove batch row
  const removeBatchRow = (idx: number) => {
    setBatchError(null);
    setBatches((prev) => prev.filter((_, i) => i !== idx));
  };

  // Handle batch field update
  const handleBatchUpdate = (idx: number, field: keyof GrnBatch, val: any) => {
    setBatchError(null);
    setBatches((prev) =>
      prev.map((b, i) => {
        if (i !== idx) return b;
        
        if (field === "productId") {
          const [prodId, poNum] = val.split("::");
          const prod = items.find((it) => it.productId === prodId && it.poNumber === poNum);
          return {
            ...b,
            productId: prodId,
            productName: prod ? prod.productName : "",
            poNumber: poNum,
          };
        }
        
        return {
          ...b,
          [field]: val,
        };
      })
    );
  };

  // Save/Submit Form Action
  const handleSubmit = (status: GrnStatus) => {
    if (!vendor) {
      alert("Please select a Vendor.");
      return;
    }
    if (selectedPoNos.length === 0) {
      alert("Please select at least one Purchase Order.");
      return;
    }
    if (!warehouse) {
      alert("Please select a warehouse.");
      return;
    }
    if (items.some((it) => it.receivedQty <= 0) && status === "qc_pending") {
      alert("Ensure received quantities are greater than zero for submission.");
      return;
    }
    if (batches.length === 0) {
      alert("Please declare at least one batch allocation.");
      return;
    }
    if (batches.some((b) => !b.batchNumber || b.quantity <= 0)) {
      alert("Please ensure batch numbers are filled and quantities are greater than zero.");
      return;
    }

    // Verify batch quantities sum matches items received quantities sum for each item (matching by productId and poNumber)
    for (const it of items) {
      const batchSum = batches
        .filter((b) => b.productId === it.productId && b.poNumber === it.poNumber)
        .reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
        
      if (batchSum !== it.receivedQty && status === "qc_pending") {
        alert(
          `Total batch quantity (${batchSum}) allocated for ${it.productName} (${it.poNumber}) does not match total received quantity (${it.receivedQty}).`
        );
        return;
      }
    }

    const newRecord: GrnRecord = {
      id: `grn-${Date.now()}`,
      grnNo,
      poNumber: selectedPoNos.join(", "),
      vendorName: vendor,
      warehouse,
      grnDate,
      totalProducts: items.length,
      totalQty: items.reduce((sum, it) => sum + it.receivedQty, 0),
      status,
      items,
      batches: batches.map(b => ({ ...b, quantity: Number(b.quantity) || 0 })),
    };

    saveGrnRecord(newRecord);
    alert(status === "draft" ? "GRN Draft Saved!" : "GRN Submitted to Quality Check!");
    router.push("/warehouse/grnqc");
  };

  return (
    <FormContainer
      title="Generate GRN"
      description="Register inward stock parameters and assign lot batches."
      onBack={() => router.push("/warehouse/grnqc")}
      onCancel={() => router.push("/warehouse/grnqc")}
      actions={
        <>
          <Button
            variant="outline"
            className="h-9 text-xs font-semibold rounded-lg gap-1.5"
            onClick={() => handleSubmit("draft")}
          >
            <Save className="w-3.5 h-3.5 text-muted-foreground" /> Save Draft
          </Button>
          <Button
            className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg gap-1.5"
            onClick={() => handleSubmit("qc_pending")}
          >
            <Send className="w-3.5 h-3.5" /> Submit GRN
          </Button>
        </>
      }
    >
      {/* Section 1 : Header Information */}
      <FormSection title="Section 1: Receipt Header Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <TextField
            label="GRN Number"
            value={grnNo}
            readOnly
            className="h-8 text-xs font-mono font-bold bg-muted/30"
          />

          <Field label="Vendor">
            <AutocompleteSelect
              options={vendors.map((v) => ({ value: v, label: v }))}
              value={vendor}
              onChange={handleVendorChange}
              placeholder="Select Vendor..."
              searchPlaceholder="Search Vendor..."
              className="h-8 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
            />
          </Field>

          <Field label="PO Number">
            <AutocompleteSelect
              options={availablePos.map((po) => ({ value: po.poNumber, label: po.poNumber }))}
              value={selectedPoNos}
              onChange={handlePoChange}
              placeholder="Select PO(s)..."
              searchPlaceholder="Search PO..."
              multiple={true}
              disabled={!vendor}
              className="h-8 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
            />
          </Field>

          <Field label="Warehouse Destination">
            <AutocompleteSelect
              options={[
                { value: "Central Warehouse", label: "Central Warehouse" },
                { value: "North Zone Hub", label: "North Zone Hub" },
                { value: "South Zone Depot", label: "South Zone Depot" },
                { value: "West Zone Hub", label: "West Zone Hub" }
              ]}
              value={warehouse}
              onChange={setWarehouse}
              placeholder="Select Warehouse..."
              searchPlaceholder="Search warehouse..."
              className="h-8 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
            />
          </Field>

          <TextField
            label="GRN Date"
            type="date"
            value={grnDate}
            onChange={(e: any) => setGrnDate(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </FormSection>

      <hr className="border-border" />

      {/* Section 2 : Item Details Grid */}
      <FormSection title="Section 2: Ordered Items Summary">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Select a vendor and at least one Purchase Order to view items details list.
          </p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground w-36">PO Number</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground">Product</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-36">Ordered Qty</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-36">Received Qty</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={`${it.productId}-${it.poNumber}-${idx}`} className="border-b border-border/50">
                    <td className="px-4 py-2 text-xs font-mono font-bold text-muted-foreground">
                      {it.poNumber}
                    </td>
                    <td className="px-4 py-2 text-xs font-semibold text-foreground">
                      {it.productName}
                      <span className="block text-[10px] text-muted-foreground font-mono">{it.productCode}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-center font-medium">{it.orderedQty}</td>
                    <td className="px-4 py-2 text-xs text-center">
                      <Input
                        type="number"
                        value={it.receivedQty}
                        onChange={(e) => handleItemQtyChange(it.productId, it.poNumber || "", e.target.value)}
                        className="h-8 text-xs text-center w-24 mx-auto"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormSection>

      <hr className="border-border" />

      {/* Section 3 : Batch Details */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Section 3: Lot Batch Configuration
            </h2>
            {batchError && (
              <span className="text-xs text-red-500 font-medium flex items-center gap-1 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {batchError}
              </span>
            )}
          </div>
          {items.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBatchRow}
              className="h-7 text-xs gap-1 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" /> Add Batch Row
            </Button>
          )}
        </div>

        {batches.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Lot allocation grid is currently empty.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground">Product</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground w-44">Batch/Lot No</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground w-40">Mfg Date</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground w-40">Expiry Date</th>
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">Quantity</th>
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="px-4 py-2 text-xs">
                         <AutocompleteSelect
                           options={items.map((it) => ({
                             value: `${it.productId}::${it.poNumber}`,
                             label: `${it.productName} (${it.poNumber})`
                           }))}
                           value={`${b.productId}::${b.poNumber}`}
                           onChange={(val) => handleBatchUpdate(idx, "productId", val)}
                           placeholder="Select product..."
                           searchPlaceholder="Search product..."
                           className="h-8 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
                         />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          placeholder="Batch No..."
                          value={b.batchNumber}
                          onChange={(e) => handleBatchUpdate(idx, "batchNumber", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="date"
                          value={b.mfgDate}
                          onChange={(e) => handleBatchUpdate(idx, "mfgDate", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="date"
                          value={b.expDate}
                          onChange={(e) => handleBatchUpdate(idx, "expDate", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          value={b.quantity}
                          onChange={(e) => handleBatchUpdate(idx, "quantity", Number(e.target.value) || 0)}
                          className="h-8 text-xs text-center mx-auto"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={batches.length <= 1}
                          onClick={() => removeBatchRow(idx)}
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </FormContainer>
  );
}
