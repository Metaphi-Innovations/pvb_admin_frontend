"use client";

import type { DeliveryChallanViewModel } from "./deliveryChallanPdf";
import { PARAMVERSE_COMPANY } from "@/lib/pdf/paramverse";

/** On-screen preview matching the Paramverse Delivery Challan PDF layout. */
export function DeliveryChallanPreview({
  data,
}: {
  data: DeliveryChallanViewModel;
}) {
  const totalQty = data.lines.reduce((s, l) => s + (l.qty || 0), 0);
  const totalAmount = data.lines.reduce((s, l) => s + (l.amount || 0), 0);
  const inr = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden text-[11px] text-[#1a1a1a] font-sans">
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-[68px_1fr_auto] gap-3 border-b border-slate-200 pb-3">
          <div />
          <div>
            <p className="text-[13px] font-bold uppercase tracking-wide">
              {data.companyName || PARAMVERSE_COMPANY.companyName}
            </p>
            <p className="text-[10px] text-slate-600 leading-relaxed mt-0.5">
              {data.companyAddress || PARAMVERSE_COMPANY.companyAddress}
            </p>
            <p className="text-[10px] text-slate-600">
              {data.companyMetaLine || PARAMVERSE_COMPANY.companyMetaLine}
            </p>
          </div>
          <p className="text-[15px] font-bold uppercase text-right whitespace-nowrap">
            Delivery Challan
          </p>
        </div>

        <div className="grid grid-cols-4 border border-slate-200 text-[10px]">
          {[
            ["Challan No.", data.challanNo],
            ["Challan Date", data.date],
            ["Reference No.", data.referenceNo || data.sourceDocument],
            ["Vehicle No.", data.vehicleNo],
            ["Transporter", data.transporter],
            ["Place of Supply", data.placeOfSupply],
            ["Driver Name", data.driverName],
            ["Driver Mobile", data.driverMobile],
          ].map(([label, value]) => (
            <div key={label} className="border border-slate-100 px-2 py-1.5">
              <p className="uppercase text-slate-500 font-semibold text-[9px]">
                {label}
              </p>
              <p className="font-bold mt-0.5">{value || "—"}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase border-b border-slate-200 pb-1 mb-2">
            Dispatch, Billing & Shipping Details
          </p>
          <div className="grid grid-cols-3 border border-slate-200 divide-x divide-slate-200">
            {[data.dispatchFrom, data.billing, data.shipping].map((party, i) => (
              <div key={i} className="p-2 min-h-[84px]">
                <p className="font-bold">{party?.name || "—"}</p>
                {(party?.lines || []).map((line) => (
                  <p key={line} className="text-slate-700 text-[10px]">
                    {line}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase border-b border-slate-200 pb-1 mb-2">
            Item Details
          </p>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                {["Sr", "Product Name", "HSN", "Qty", "UOM", "Rate", "Amount"].map(
                  (h) => (
                    <th
                      key={h}
                      className="border border-slate-200 px-1.5 py-1 uppercase text-[9px]"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {data.lines.map((line) => (
                <tr key={line.sr}>
                  <td className="border border-slate-200 px-1.5 py-1 text-center">
                    {line.sr}
                  </td>
                  <td className="border border-slate-200 px-1.5 py-1">
                    {line.productName}
                  </td>
                  <td className="border border-slate-200 px-1.5 py-1 text-center">
                    {line.hsnCode || "—"}
                  </td>
                  <td className="border border-slate-200 px-1.5 py-1 text-right">
                    {line.qty}
                  </td>
                  <td className="border border-slate-200 px-1.5 py-1 text-center">
                    {line.uom || "—"}
                  </td>
                  <td className="border border-slate-200 px-1.5 py-1 text-right">
                    {inr.format(line.rate || 0)}
                  </td>
                  <td className="border border-slate-200 px-1.5 py-1 text-right">
                    {inr.format(line.amount || 0)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="border border-slate-200 px-1.5 py-1" colSpan={3} />
                <td className="border border-slate-200 px-1.5 py-1 text-right">
                  {totalQty}
                </td>
                <td className="border border-slate-200 px-1.5 py-1" colSpan={2} />
                <td className="border border-slate-200 px-1.5 py-1 text-right">
                  ₹ {inr.format(totalAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-[1fr_1fr_180px] gap-3">
          <div className="border border-slate-200 p-2">
            <p className="font-bold uppercase text-[9px] mb-1">Declaration</p>
            <p className="text-slate-700 text-[10px] leading-relaxed">
              {data.declaration ||
                "Goods covered under this challan are not sold and are being transported for the purpose mentioned above."}
            </p>
          </div>
          <div className="border border-slate-200 p-2">
            <p className="font-bold uppercase text-[9px] mb-1">Remarks</p>
            <p className="text-slate-700 text-[10px]">{data.remarks || "—"}</p>
          </div>
          <div>
            <p className="font-bold uppercase text-[9px] mb-1 border-b border-slate-200 pb-1">
              Summary
            </p>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>Total Items</span>
                <span className="font-semibold">{data.lines.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Quantity</span>
                <span className="font-semibold">{totalQty}</span>
              </div>
              <div className="flex justify-between bg-slate-100 px-1 py-1 font-bold">
                <span>Total Amount</span>
                <span>₹ {inr.format(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
