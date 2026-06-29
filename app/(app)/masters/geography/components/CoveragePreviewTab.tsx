"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getDistinctCities, getDistinctDistricts, getDistinctStates, getDistinctTowns } from "../pincode-data";
import {
  buildCustomerImpactRows,
  CUSTOMER_TYPE_FILTER_OPTIONS,
  getGeographyOptionsFlat,
} from "../geography-workflow-data";

export function CoveragePreviewTab() {
  const [geographyId, setGeographyId] = useState("__all__");
  const [user, setUser] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [town, setTown] = useState("");
  const [pincode, setPincode] = useState("");

  const geoOptions = useMemo(() => getGeographyOptionsFlat(), []);
  const states = useMemo(() => getDistinctStates(), []);
  const districts = useMemo(() => getDistinctDistricts(state), [state]);
  const cities = useMemo(() => getDistinctCities(state, district), [state, district]);
  const towns = useMemo(() => getDistinctTowns(state, district, city), [state, district, city]);

  const filters = useMemo(
    () => ({
      geographyId: geographyId === "__all__" ? null : Number(geographyId),
      user: user || undefined,
      customerType: customerType || undefined,
      state: state || undefined,
      district: district || undefined,
      city: city || undefined,
      town: town || undefined,
      pincode: pincode || undefined,
    }),
    [geographyId, user, customerType, state, district, city, town, pincode],
  );

  const rows = useMemo(() => buildCustomerImpactRows(filters), [filters]);
  const warningCount = rows.reduce((n, r) => n + r.warnings.length, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Coverage Impact</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Read-only verification: which customers fall under each territory, who is assigned, and which approver chain applies — based on current pincode mapping.
        </p>
      </div>

      <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4">
        <p className="text-[11px] font-semibold text-brand-800 mb-2">Resolution chain</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border">
            <Users className="w-3.5 h-3.5" />
            Customer
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="px-2 py-1 rounded-md bg-white border">Pincode</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="px-2 py-1 rounded-md bg-white border">Territory</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="px-2 py-1 rounded-md bg-white border">Area</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="px-2 py-1 rounded-md bg-white border">Region</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="px-2 py-1 rounded-md bg-white border font-semibold">Zone</span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-4 space-y-3">
        <p className="text-xs font-semibold">Customers</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Geography</Label>
            <Select value={geographyId} onValueChange={setGeographyId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">All</SelectItem>
                {geoOptions.map((o) => <SelectItem key={o.id} value={String(o.id)} className="text-xs">{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">User</Label>
            <Input className="h-8 text-xs" value={user} onChange={(e) => setUser(e.target.value)} placeholder="Search user" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Customer Type</Label>
            <Select value={customerType || "__all__"} onValueChange={(v) => setCustomerType(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">All</SelectItem>
                {CUSTOMER_TYPE_FILTER_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">State</Label>
            <Select value={state || "__all__"} onValueChange={(v) => { setState(v === "__all__" ? "" : v); setDistrict(""); setCity(""); setTown(""); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="__all__" className="text-xs">All</SelectItem>{states.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">District</Label>
            <Select value={district || "__all__"} onValueChange={(v) => { setDistrict(v === "__all__" ? "" : v); setCity(""); setTown(""); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="__all__" className="text-xs">All</SelectItem>{districts.map((d) => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">City</Label>
            <Select value={city || "__all__"} onValueChange={(v) => { setCity(v === "__all__" ? "" : v); setTown(""); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="__all__" className="text-xs">All</SelectItem>{cities.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Town</Label>
            <Select value={town || "__all__"} onValueChange={(v) => setTown(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="__all__" className="text-xs">All</SelectItem>{towns.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Pincode</Label>
            <Input className="h-8 text-xs" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="400058" />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{rows.length} customers · {warningCount} warning(s)</p>

      <div className="rounded-xl border border-border bg-white overflow-x-auto">
        <table className="w-full text-xs min-w-[1600px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {[
                "Customer Code",
                "Customer Name",
                "Customer Type",
                "Pincode",
                "Town",
                "Territory",
                "Area",
                "Region",
                "Zone",
                "Assigned User",
                "Approver Chain",
                "Status",
                "Warnings",
              ].map((h) => (
                <th key={h} className="text-left px-2 py-2.5 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-muted-foreground">
                  No customers match the selected filters.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={`${row.customerCode}-${row.pincode}-${i}`} className="border-b border-border/60 hover:bg-muted/20">
                  <td className="px-2 py-2 font-mono">{row.customerCode}</td>
                  <td className={cn("px-2 py-2 font-medium", row.customerSource === "demo" && row.customerName !== "—" && "text-amber-700")}>
                    {row.customerName}
                  </td>
                  <td className="px-2 py-2">{row.customerType}</td>
                  <td className="px-2 py-2 font-mono font-semibold">{row.pincode}</td>
                  <td className="px-2 py-2">{row.town}</td>
                  <td className="px-2 py-2 font-medium">{row.territory}</td>
                  <td className="px-2 py-2">{row.area}</td>
                  <td className="px-2 py-2">{row.region}</td>
                  <td className="px-2 py-2">{row.zone}</td>
                  <td className="px-2 py-2 max-w-[140px]">{row.assignedUser}</td>
                  <td className="px-2 py-2 text-brand-800 max-w-[200px]">{row.approverChain}</td>
                  <td className="px-2 py-2">{row.status}</td>
                  <td className="px-2 py-2">
                    {row.warnings.length > 0 ? row.warnings.map((w) => (
                      <p key={w} className="text-[10px] text-amber-700 flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />{w}
                      </p>
                    )) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
