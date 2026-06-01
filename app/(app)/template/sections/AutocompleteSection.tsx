"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Check, ChevronsUpDown, X, Loader2, Search, User,
  Building2, MapPin, Wheat, Package, AlertCircle,
  ChevronDown, Users, CheckCircle2, XCircle,
} from "lucide-react";

// ── Shared: option item ─────────────────────────────────────────────────────
function Opt({
  label, selected, onClick, icon, trailing, disabled = false,
}: {
  label: string; selected: boolean; onClick: () => void;
  icon?: React.ReactNode; trailing?: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-lg transition-colors",
        "hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed",
        selected && "bg-brand-50",
      )}
    >
      {icon && <span className="flex-shrink-0 text-muted-foreground">{icon}</span>}
      <span className="flex-1 text-foreground truncate">{label}</span>
      {trailing && <span className="flex-shrink-0">{trailing}</span>}
      {selected && <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />}
    </button>
  );
}

// ── Shared: search box inside dropdown ─────────────────────────────────────
function DropSearch({ value, onChange, placeholder = "Search…" }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="p-2 border-b border-border">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-[7px] text-muted-foreground pointer-events-none" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className="w-full pl-8 pr-3 py-1.5 text-sm focus:outline-none bg-transparent"
        />
        {value && (
          <button onClick={() => onChange("")} className="absolute right-2 top-[7px]">
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Shared: empty / loading states in dropdown ─────────────────────────────
function DropEmpty({ search, loading }: { search: string; loading?: boolean }) {
  if (loading) return (
    <div className="flex items-center justify-center py-7 gap-2 text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-xs">Loading…</span>
    </div>
  );
  return (
    <div className="flex flex-col items-center py-7 gap-1.5">
      <Search className="w-5 h-5 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">
        {search ? `No results for "${search}"` : "No options available"}
      </p>
    </div>
  );
}

// ── Shared: trigger button ──────────────────────────────────────────────────
function ComboTrigger({
  label, placeholder = "Select…", open = false, error = false, disabled = false, className,
}: {
  label?: React.ReactNode; placeholder?: string;
  open?: boolean; error?: boolean; disabled?: boolean; className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 text-sm border rounded-input bg-white cursor-pointer",
        "transition-colors select-none",
        open && !error   ? "border-brand-400 ring-1 ring-brand-400" : "",
        error            ? "border-red-400 ring-1 ring-red-200" : !open ? "border-border hover:border-brand-300" : "",
        disabled         ? "opacity-50 cursor-not-allowed bg-muted/30" : "",
        className,
      )}
    >
      <span className={label ? "text-foreground truncate" : "text-muted-foreground"}>
        {label ?? placeholder}
      </span>
      <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
    </div>
  );
}

// ── Shared: status pill ─────────────────────────────────────────────────────
const STATUS_CFG: Record<string, string> = {
  active:   "bg-emerald-100 text-emerald-700",
  pending:  "bg-amber-100  text-amber-700",
  inactive: "bg-slate-100  text-slate-600",
  draft:    "bg-slate-100  text-slate-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100   text-red-700",
};

function SPill({ status }: { status: string }) {
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_CFG[status] ?? "bg-slate-100 text-slate-700")}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. SEARCHABLE SINGLE SELECT
// ══════════════════════════════════════════════════════════════════════════════
const CROPS = ["Wheat", "Paddy (IR64)", "Maize (Hybrid)", "Soybean", "Cotton (BT)", "Sugarcane", "Barley", "Mustard", "Groundnut", "Jowar"];

function SearchableSingle() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [q, setQ] = useState("");

  const filtered = CROPS.filter(c => c.toLowerCase().includes(q.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <button type="button" className="w-full text-left">
          <ComboTrigger label={value || undefined} placeholder="Select crop…" open={open} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] rounded-xl shadow-xl border-border" align="start" sideOffset={4}>
        <DropSearch value={q} onChange={setQ} placeholder="Search crops…" />
        <div className="max-h-52 overflow-y-auto p-1.5">
          {filtered.length === 0 ? <DropEmpty search={q} /> : filtered.map(c => (
            <Opt key={c} label={c} selected={value === c}
              icon={<Wheat className="w-3.5 h-3.5" />}
              onClick={() => { setValue(c); setOpen(false); setQ(""); }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. MULTI-SELECT WITH CHIPS
// ══════════════════════════════════════════════════════════════════════════════
const TERRITORIES = ["North Zone", "South Zone", "East Zone", "West Zone", "Central Zone", "North-East Zone", "Coastal Zone"];

function MultiSelectChips() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(["North Zone"]);
  const [q, setQ] = useState("");

  const filtered = TERRITORIES.filter(t => t.toLowerCase().includes(q.toLowerCase()));
  const toggle = (t: string) => setSelected(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  return (
    <div className="space-y-2">
      {/* Chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(t => (
            <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-brand-100 text-brand-700 rounded-lg font-medium">
              <MapPin className="w-3 h-3" /> {t}
              <button onClick={() => toggle(t)} className="ml-0.5 hover:text-brand-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selected.length > 1 && (
            <button onClick={() => setSelected([])} className="text-xs text-muted-foreground hover:text-foreground px-1">
              Clear all
            </button>
          )}
        </div>
      )}

      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
        <PopoverTrigger asChild>
          <button type="button" className="w-full text-left">
            <ComboTrigger
              label={selected.length > 0 ? `${selected.length} territory selected` : undefined}
              placeholder="Select territories…"
              open={open}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] rounded-xl shadow-xl border-border" align="start" sideOffset={4}>
          <DropSearch value={q} onChange={setQ} placeholder="Search territories…" />
          <div className="max-h-52 overflow-y-auto p-1.5">
            {filtered.length === 0 ? <DropEmpty search={q} /> : (
              <>
                {/* Select all */}
                <button
                  type="button"
                  onClick={() => setSelected(selected.length === TERRITORIES.length ? [] : [...TERRITORIES])}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-muted/60 rounded-lg"
                >
                  <Checkbox checked={selected.length === TERRITORIES.length} className="w-4 h-4" />
                  Select All
                </button>
                <div className="border-t border-border my-1" />
                {filtered.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggle(t)}
                    className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-lg hover:bg-muted/60 transition-colors",
                      selected.includes(t) && "bg-brand-50")}
                  >
                    <Checkbox checked={selected.includes(t)} className="w-4 h-4 flex-shrink-0" />
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-foreground">{t}</span>
                    {selected.includes(t) && <Check className="w-3.5 h-3.5 text-brand-600" />}
                  </button>
                ))}
              </>
            )}
          </div>
          <div className="border-t border-border p-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{selected.length} of {TERRITORIES.length} selected</span>
            <button onClick={() => setOpen(false)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Done</button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. STATUS SELECT
// ══════════════════════════════════════════════════════════════════════════════
const STATUSES = [
  { value: "active",   label: "Active",   icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
  { value: "pending",  label: "Pending",  icon: <Loader2 className="w-3.5 h-3.5 text-amber-500" /> },
  { value: "draft",    label: "Draft",    icon: <Package className="w-3.5 h-3.5 text-slate-400" /> },
  { value: "approved", label: "Approved", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
  { value: "rejected", label: "Rejected", icon: <XCircle className="w-3.5 h-3.5 text-red-500" /> },
  { value: "inactive", label: "Inactive", icon: <XCircle className="w-3.5 h-3.5 text-slate-400" /> },
];

function StatusSelect() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const selected = STATUSES.find(s => s.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="w-full text-left">
          <div className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-sm border rounded-input bg-white cursor-pointer transition-colors",
            open ? "border-brand-400 ring-1 ring-brand-400" : "border-border hover:border-brand-300",
          )}>
            {selected ? (
              <span className="flex items-center gap-2">
                {selected.icon}
                <SPill status={selected.value} />
              </span>
            ) : (
              <span className="text-muted-foreground">Filter by status…</span>
            )}
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-1.5 w-48 rounded-xl shadow-xl border-border" align="start" sideOffset={4}>
        <button
          type="button"
          onClick={() => { setValue(""); setOpen(false); }}
          className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted/60 text-left", !value && "bg-brand-50")}
        >
          <span className="text-muted-foreground text-xs">All statuses</span>
          {!value && <Check className="w-3.5 h-3.5 text-brand-600 ml-auto" />}
        </button>
        <div className="border-t border-border my-1" />
        {STATUSES.map(s => (
          <button
            key={s.value}
            type="button"
            onClick={() => { setValue(s.value); setOpen(false); }}
            className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted/60 text-left", value === s.value && "bg-brand-50")}
          >
            {s.icon}
            <SPill status={s.value} />
            {value === s.value && <Check className="w-3.5 h-3.5 text-brand-600 ml-auto" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. AVATAR OPTION SELECT (User Picker)
// ══════════════════════════════════════════════════════════════════════════════
const USERS = [
  { id: "1", name: "Rajesh Kumar",   role: "Sales Manager",  initials: "RK", color: "bg-brand-200 text-brand-700" },
  { id: "2", name: "Priya Singh",    role: "Field Officer",  initials: "PS", color: "bg-sage-200 text-sage-700"   },
  { id: "3", name: "Amit Sharma",    role: "Area Manager",   initials: "AS", color: "bg-olive-200 text-olive-700" },
  { id: "4", name: "Neha Verma",     role: "Data Analyst",   initials: "NV", color: "bg-sky-100  text-sky-700"    },
  { id: "5", name: "Vikram Rao",     role: "Sales Executive",initials: "VR", color: "bg-amber-100 text-amber-700" },
  { id: "6", name: "Sunita Devi",    role: "Territory Head", initials: "SD", color: "bg-red-100  text-red-700"    },
];

function AvatarSelect() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [q, setQ] = useState("");
  const selected = USERS.find(u => u.id === value);
  const filtered = USERS.filter(u =>
    u.name.toLowerCase().includes(q.toLowerCase()) || u.role.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <button type="button" className="w-full text-left">
          <div className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-sm border rounded-input bg-white cursor-pointer transition-colors",
            open ? "border-brand-400 ring-1 ring-brand-400" : "border-border hover:border-brand-300",
          )}>
            {selected ? (
              <span className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className={cn("text-xs font-semibold", selected.color)}>
                    {selected.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-foreground">{selected.name}</span>
                <span className="text-xs text-muted-foreground">· {selected.role}</span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                Assign to user…
              </span>
            )}
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] rounded-xl shadow-xl border-border" align="start" sideOffset={4}>
        <DropSearch value={q} onChange={setQ} placeholder="Search users…" />
        <div className="max-h-52 overflow-y-auto p-1.5">
          {filtered.length === 0 ? <DropEmpty search={q} /> : filtered.map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => { setValue(u.id); setOpen(false); setQ(""); }}
              className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left",
                value === u.id && "bg-brand-50")}
            >
              <Avatar className="w-7 h-7 flex-shrink-0">
                <AvatarFallback className={cn("text-xs font-semibold", u.color)}>{u.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-medium truncate">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.role}</p>
              </div>
              {value === u.id && <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. GROUPED OPTIONS
// ══════════════════════════════════════════════════════════════════════════════
const GROUPED = [
  { group: "North India",  items: ["Delhi", "Haryana", "Punjab", "Himachal Pradesh", "Uttarakhand", "Uttar Pradesh"] },
  { group: "South India",  items: ["Karnataka", "Tamil Nadu", "Andhra Pradesh", "Telangana", "Kerala"] },
  { group: "West India",   items: ["Maharashtra", "Gujarat", "Rajasthan", "Goa"] },
  { group: "East India",   items: ["West Bengal", "Bihar", "Odisha", "Jharkhand"] },
];

function GroupedSelect() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [q, setQ] = useState("");

  const filtered = GROUPED.map(g => ({
    ...g, items: g.items.filter(i => i.toLowerCase().includes(q.toLowerCase())),
  })).filter(g => g.items.length > 0);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <button type="button" className="w-full text-left">
          <ComboTrigger
            label={value ? <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-muted-foreground" />{value}</span> : undefined}
            placeholder="Select state…"
            open={open}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] rounded-xl shadow-xl border-border" align="start" sideOffset={4}>
        <DropSearch value={q} onChange={setQ} placeholder="Search states…" />
        <div className="max-h-56 overflow-y-auto p-1.5">
          {filtered.length === 0 ? <DropEmpty search={q} /> : filtered.map(g => (
            <div key={g.group}>
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {g.group}
              </p>
              {g.items.map(i => (
                <Opt key={i} label={i} selected={value === i}
                  icon={<MapPin className="w-3.5 h-3.5" />}
                  onClick={() => { setValue(i); setOpen(false); setQ(""); }}
                />
              ))}
              <div className="border-t border-border/50 my-1 last:hidden" />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. ASYNC SEARCH (simulated)
// ══════════════════════════════════════════════════════════════════════════════
const ALL_DISTRIBUTORS = [
  "Green Valley Agro Pvt Ltd", "Sunrise Exports & Co", "Metro Retail Ltd",
  "Rural Co-op Society", "Agri Mart Chain", "FarmerFirst Pvt Ltd",
  "Krishna Agro Industries", "Bharat Fertilisers", "National Agro Corp",
  "Deccan Seeds Distributors",
];

function AsyncSelect() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!open) { setResults([]); return; }
    if (!q.trim()) { setResults([]); setLoading(false); return; }

    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const r = ALL_DISTRIBUTORS.filter(d => d.toLowerCase().includes(q.toLowerCase()));
      setResults(r);
      setLoading(false);
    }, 600);

    return () => clearTimeout(debounceRef.current);
  }, [q, open]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setQ(""); setResults([]); } }}>
      <PopoverTrigger asChild>
        <button type="button" className="w-full text-left">
          <ComboTrigger
            label={value ? <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-muted-foreground" />{value}</span> : undefined}
            placeholder="Search distributor…"
            open={open}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] rounded-xl shadow-xl border-border" align="start" sideOffset={4}>
        <DropSearch value={q} onChange={setQ} placeholder="Type to search distributors…" />
        <div className="max-h-52 overflow-y-auto p-1.5">
          {!q.trim() ? (
            <div className="py-6 text-center">
              <p className="text-xs text-muted-foreground">Type at least 1 character to search</p>
            </div>
          ) : loading ? <DropEmpty search={q} loading /> : results.length === 0 ? <DropEmpty search={q} /> : (
            results.map(r => (
              <Opt key={r} label={r} selected={value === r}
                icon={<Building2 className="w-3.5 h-3.5" />}
                onClick={() => { setValue(r); setOpen(false); setQ(""); setResults([]); }}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. STATES: Disabled & Error
// ══════════════════════════════════════════════════════════════════════════════
function DisabledSelect() {
  return (
    <div className="space-y-1.5">
      <div className="opacity-50 cursor-not-allowed">
        <ComboTrigger placeholder="Not available" disabled />
      </div>
      <p className="text-xs text-muted-foreground">Disabled — no interaction</p>
    </div>
  );
}

function ErrorSelect() {
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [value, setValue] = useState("");
  const [q, setQ] = useState("");
  const showError = touched && !value;

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setQ(""); setTouched(true); } }}>
        <PopoverTrigger asChild>
          <button type="button" className="w-full text-left" onBlur={() => setTouched(true)}>
            <ComboTrigger placeholder="Select product…" open={open} error={showError} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] rounded-xl shadow-xl border-border" align="start" sideOffset={4}>
          <DropSearch value={q} onChange={setQ} placeholder="Search products…" />
          <div className="max-h-48 overflow-y-auto p-1.5">
            {["Urea 50kg", "DAP 50kg", "NPK 10:26:26", "Hybrid Maize Seed", "Paddy IR64"]
              .filter(i => i.toLowerCase().includes(q.toLowerCase()))
              .map(i => <Opt key={i} label={i} selected={value === i}
                icon={<Package className="w-3.5 h-3.5" />}
                onClick={() => { setValue(i); setOpen(false); setQ(""); }}
              />)
            }
          </div>
        </PopoverContent>
      </Popover>
      {showError && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Product is required
        </p>
      )}
      {!showError && value && (
        <p className="text-xs text-emerald-600 flex items-center gap-1">
          <Check className="w-3 h-3" /> Valid product selected
        </p>
      )}
      <p className="text-xs text-muted-foreground">Close without selecting to see error state</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════
function DemoBox({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {note && <p className="text-[11px] text-muted-foreground mt-0.5">{note}</p>}
      </div>
      {children}
    </div>
  );
}

export default function AutocompleteSection() {
  return (
    <div className="space-y-10">

      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">
          Global dropdown foundation for the entire Dharitri Sutra Agri ERP. All selects/dropdowns across the platform
          follow MUI Autocomplete-style UX — built with ShadCN Popover, Checkbox, Badge, and Avatar.
          No native <code className="text-xs bg-muted px-1 py-0.5 rounded">{"<select>"}</code> elements.
        </p>
      </div>

      {/* ── Row 1: Core Selects ── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Core Select Patterns</h3>
        <div className="grid grid-cols-3 gap-6">
          <DemoBox label="Searchable Single Select" note="Type to filter — select one option, checkmark on active">
            <SearchableSingle />
          </DemoBox>
          <DemoBox label="Status Select" note="Options rendered as status pills with icon indicators">
            <StatusSelect />
          </DemoBox>
          <DemoBox label="Grouped Options" note="Options organized into labelled groups with dividers">
            <GroupedSelect />
          </DemoBox>
        </div>
      </section>

      {/* ── Row 2: Multi-Select & Avatar ── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Multi-Select & User Picker</h3>
        <div className="grid grid-cols-2 gap-6">
          <DemoBox label="Multi-Select with Chips" note="Check multiple options — selected items appear as removable chips above the input">
            <MultiSelectChips />
          </DemoBox>
          <DemoBox label="Avatar User Select" note="Employee/user picker with avatar, name, and role — ideal for assignment flows">
            <AvatarSelect />
          </DemoBox>
        </div>
      </section>

      {/* ── Row 3: Async Search ── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Async Search</h3>
        <div className="grid grid-cols-2 gap-6">
          <DemoBox label="Async / Debounced Search" note="Type a distributor name — results load after 600ms debounce (simulated API call)">
            <AsyncSelect />
          </DemoBox>
          <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-foreground">How Async Search Works</p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>1. User types — debounce timer (300–600ms) starts</p>
              <p>2. On timer fire → call API with <code className="bg-muted px-1 rounded">?q=term</code></p>
              <p>3. Show skeleton/spinner while loading</p>
              <p>4. Render results or "No results" on API response</p>
              <p>5. Cancel in-flight requests on new input (AbortController)</p>
            </div>
            <div className="mt-3 space-y-1 text-xs">
              <p className="font-medium text-foreground">ERP Use Cases:</p>
              <p className="text-muted-foreground">• Distributor / retailer name search</p>
              <p className="text-muted-foreground">• Farmer registry lookup</p>
              <p className="text-muted-foreground">• Product catalogue search</p>
              <p className="text-muted-foreground">• Employee assignment</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Row 4: States ── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Validation & State Variants</h3>
        <div className="grid grid-cols-3 gap-6">
          <DisabledSelect />
          <ErrorSelect />
          <div className="space-y-2.5">
            <div>
              <p className="text-xs font-semibold text-foreground">Loading State Inside Dropdown</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Shown while async results are fetching</p>
            </div>
            <div className="border border-border rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-[7px] text-muted-foreground" />
                  <div className="w-full pl-8 pr-3 py-1.5 text-sm text-muted-foreground">rajesh…</div>
                </div>
              </div>
              <div className="flex items-center justify-center py-7 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Loading results…</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Usage Guide ── */}
      <section>
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-brand-700 mb-3">Autocomplete / Select — Platform Standard</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-brand-800/80">
            <p>• Never use native <code className="bg-white/60 px-1 rounded">{"<select>"}</code> — always use Popover-based combobox</p>
            <p>• Debounce async calls at 300–600ms to avoid API flooding</p>
            <p>• Always include a search box inside the dropdown for 5+ options</p>
            <p>• Show loading spinner while async results are fetching</p>
            <p>• Show "No results" state with the searched term in the message</p>
            <p>• Multi-select: render chips above the trigger for visual feedback</p>
            <p>• Status selects: render status pills as options, not plain text</p>
            <p>• User selects: always show avatar + name + role for disambiguation</p>
            <p>• Grouped selects: use for locations, categories, module-type filters</p>
            <p>• Error state: show message below field, red border on trigger</p>
            <p>• Disabled state: 50% opacity, cursor-not-allowed, no interaction</p>
            <p>• Always show checkmark on selected option for single-select clarity</p>
          </div>
        </div>
      </section>

    </div>
  );
}
