"use client";

import type { DeliveryChallanViewModel } from "./deliveryChallanPdf";

/** On-screen preview matching the Delivery Challan PDF layout. */
export function DeliveryChallanPreview({
  data,
}: {
  data: DeliveryChallanViewModel;
}) {
  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden text-[12px] text-[#1a1a1a] font-sans">
      <div className="p-6 space-y-6">
        <div className="flex justify-between gap-6 items-start">
          <div className="min-w-0">
            <p className="text-[18px] font-bold text-[#B85508] leading-snug">
              {data.companyName}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed">{data.companyAddress}</p>
            <p className="text-[11px]">GSTIN: {data.companyGstin}</p>
          </div>
          <div className="text-right shrink-0 min-w-[160px]">
            <p className="text-[13px] font-bold text-[#1A3A96] tracking-wide">
              DELIVERY CHALLAN
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-500">
              Challan No.
            </p>
            <p className="font-bold text-[12px]">{data.challanNo}</p>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-500">
              Dispatch No.
            </p>
            <p className="text-[12px]">{data.dispatchNo}</p>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-500">
              Date
            </p>
            <p className="text-[12px]">{data.date || "—"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-2.5">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Deliver To
              </p>
              <p className="font-semibold mt-0.5">{data.deliverTo}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Source Document
              </p>
              <p className="mt-0.5">{data.sourceDocument}</p>
            </div>
          </div>
          <div className="space-y-2.5">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Warehouse
              </p>
              <p className="font-semibold mt-0.5">{data.warehouse}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Transporter
              </p>
              <p className="mt-0.5">{data.transporter}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Vehicle No.
              </p>
              <p className="mt-0.5">{data.vehicleNo}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                LR No.
              </p>
              <p className="mt-0.5">{data.lrNo}</p>
            </div>
          </div>
        </div>

        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-200 px-2 py-2 text-left text-[11px] font-bold w-9">
                #
              </th>
              <th className="border border-slate-200 px-2 py-2 text-left text-[11px] font-bold w-28">
                SKU
              </th>
              <th className="border border-slate-200 px-2 py-2 text-left text-[11px] font-bold">
                Product
              </th>
              <th className="border border-slate-200 px-2 py-2 text-right text-[11px] font-bold w-36">
                Dispatch Qty
              </th>
            </tr>
          </thead>
          <tbody>
            {data.lines.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="border border-slate-200 px-3 py-3 text-center text-slate-500"
                >
                  No line items
                </td>
              </tr>
            ) : (
              data.lines.map((line) => (
                <tr key={line.sr}>
                  <td className="border border-slate-200 px-2 py-1.5 text-center">
                    {line.sr}
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5">{line.sku}</td>
                  <td className="border border-slate-200 px-2 py-1.5">
                    {line.productName}
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 text-right">
                    {line.qtyLabel}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="border-t border-slate-200 pt-3 text-[11px] text-slate-500 space-y-1">
          <p>This is a Delivery Challan for goods dispatched. Not a tax invoice.</p>
          <p>
            Generated on {data.generatedOn} · Challan No: {data.challanNo} ·
            Dispatch: {data.dispatchNo}
          </p>
        </div>
      </div>
    </div>
  );
}
