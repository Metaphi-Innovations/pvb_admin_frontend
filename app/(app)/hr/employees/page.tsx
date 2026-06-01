"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Users, Plus, Download, Search, SlidersHorizontal, X, MoreVertical, ChevronDown, ChevronsUpDown, Eye, Edit, Trash2, UserCheck, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

interface Employee {
  id: number;
  empCode: string;
  name: string;
  email: string;
  mobile: string;
  department: string;
  designation: string;
  status: "active" | "inactive";
  joinDate: string;
  territory: string;
}

const SEED: Employee[] = [
  { id: 1, empCode: "EMP-001", name: "Rajesh Kumar", email: "rajesh.kumar@dharitrisutra.com", mobile: "9876543210", department: "Sales", designation: "Sales Manager", status: "active", joinDate: "2022-03-15", territory: "North Zone" },
  { id: 2, empCode: "EMP-002", name: "Priya Singh", email: "priya.singh@dharitrisutra.com", mobile: "9876543211", department: "Sales", designation: "Sales Executive", status: "active", joinDate: "2022-06-01", territory: "South Zone" },
  { id: 3, empCode: "EMP-003", name: "Amit Sharma", email: "amit.sharma@dharitrisutra.com", mobile: "9876543212", department: "Sales", designation: "Sales Executive", status: "active", joinDate: "2023-01-10", territory: "East Zone" },
  { id: 4, empCode: "EMP-004", name: "Neha Patel", email: "neha.patel@dharitrisutra.com", mobile: "9876543213", department: "Sales", designation: "Senior Sales Executive", status: "active", joinDate: "2021-11-20", territory: "West Zone" },
  { id: 5, empCode: "EMP-005", name: "Vikram Das", email: "vikram.das@dharitrisutra.com", mobile: "9876543214", department: "Sales", designation: "Sales Executive", status: "inactive", joinDate: "2023-04-05", territory: "Central Zone" },
  { id: 6, empCode: "EMP-006", name: "Sunita Rao", email: "sunita.rao@dharitrisutra.com", mobile: "9876543215", department: "HR", designation: "HR Manager", status: "active", joinDate: "2020-08-01", territory: "HQ" },
  { id: 7, empCode: "EMP-007", name: "Mohan Verma", email: "mohan.verma@dharitrisutra.com", mobile: "9876543216", department: "Accounts", designation: "Accountant", status: "active", joinDate: "2021-02-14", territory: "HQ" },
  { id: 8, empCode: "EMP-008", name: "Kavita Nair", email: "kavita.nair@dharitrisutra.com", mobile: "9876543217", department: "Operations", designation: "Warehouse Manager", status: "active", joinDate: "2022-09-01", territory: "South Zone" },
  { id: 9, empCode: "EMP-009", name: "Arun Mehta", email: "arun.mehta@dharitrisutra.com", mobile: "9876543218", department: "IT", designation: "IT Manager", status: "active", joinDate: "2020-01-05", territory: "HQ" },
  { id: 10, empCode: "EMP-010", name: "Pooja Gupta", email: "pooja.gupta@dharitrisutra.com", mobile: "9876543219", department: "Finance", designation: "Finance Analyst", status: "inactive", joinDate: "2023-07-15", territory: "HQ" },
];

function StatusPill({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
      isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>
      <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-slate-400")} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function SortTh({ label, colKey, sortKey, sortDir, onSort }: {
  label: string; colKey: string; sortKey: string; sortDir: "asc" | "desc"; onSort: (k: string) => void;
}) {
  const active = sortKey === colKey;
  return (
    <th onClick={() => onSort(colKey)} className={cn("px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap", active && "bg-brand-50/60")}>
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active ? <ChevronDown className={cn("w-3 h-3 text-brand-600", sortDir === "desc" && "rotate-180")} />
          : <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />}
      </div>
    </th>
  );
}

export default function EmployeesPage() {
  const [employees] = useState<Employee[]>(SEED);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const departments = [...new Set(SEED.map(e => e.department))];
  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let d = employees.filter(e => {
      const q = search.toLowerCase();
      return !q || e.name.toLowerCase().includes(q) || e.empCode.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.department.toLowerCase().includes(q);
    });
    if (filterDept.length) d = d.filter(e => filterDept.includes(e.department));
    if (filterStatus.length) d = d.filter(e => filterStatus.includes(e.status));
    return [...d].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [employees, search, filterDept, filterStatus, sortKey, sortDir]);

  const filterCount = filterDept.length + filterStatus.length;

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Employees</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage your organization's workforce</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Employee
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Employees", value: employees.length, icon: Users, accent: true },
            { label: "Active", value: employees.filter(e => e.status === "active").length, icon: UserCheck },
            { label: "Inactive", value: employees.filter(e => e.status === "inactive").length, icon: UserX },
            { label: "Departments", value: departments.length, icon: Users },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", accent ? "bg-brand-600" : "bg-muted")}>
                <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
              </div>
              <div>
                <p className="text-base font-bold text-foreground leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, code, email…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div className="relative">
            <button onClick={() => setFilterOpen(p => !p)}
              className={cn("h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                filterCount ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border text-muted-foreground hover:bg-muted")}>
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
              {filterCount > 0 && <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">{filterCount}</span>}
            </button>
            {filterOpen && (
              <div className="absolute top-9 left-0 z-50 bg-white border border-border rounded-xl shadow-lg w-56 p-0">
                <div className="px-3 py-2.5 border-b border-border"><p className="text-xs font-semibold">Department</p></div>
                <div className="px-3 py-2 space-y-1.5 max-h-36 overflow-y-auto">
                  {departments.map(d => (
                    <label key={d} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded accent-brand-600"
                        checked={filterDept.includes(d)} onChange={() => setFilterDept(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])} />
                      <span className="text-xs">{d}</span>
                    </label>
                  ))}
                </div>
                <div className="px-3 py-2.5 border-t border-border"><p className="text-xs font-semibold">Status</p></div>
                <div className="px-3 py-2 space-y-1.5">
                  {["active", "inactive"].map(s => (
                    <label key={s} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded accent-brand-600"
                        checked={filterStatus.includes(s)} onChange={() => setFilterStatus(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])} />
                      <span className="text-xs capitalize">{s}</span>
                    </label>
                  ))}
                </div>
                {filterCount > 0 && (
                  <div className="px-3 py-2 border-t border-border">
                    <button onClick={() => { setFilterDept([]); setFilterStatus([]); }} className="text-xs text-brand-600 hover:underline">Clear all</button>
                  </div>
                )}
              </div>
            )}
          </div>
          {filterDept.map(d => (
            <span key={d} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
              {d} <button onClick={() => setFilterDept(p => p.filter(x => x !== d))}><X className="w-3 h-3" /></button>
            </span>
          ))}
          <p className="text-xs text-muted-foreground ml-auto">{filtered.length} employees</p>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="Emp Code" colKey="empCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Name" colKey="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Department" colKey="department" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Designation" colKey="designation" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Territory" colKey="territory" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Join Date" colKey="joinDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="flex flex-col items-center gap-2 py-16">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Users className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No employees found</p>
                    </div>
                  </td></tr>
                ) : filtered.map(emp => (
                  <tr key={emp.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{emp.empCode}</span></td>
                    <td className="px-4 py-2">
                      <p className="text-xs font-semibold text-foreground">{emp.name}</p>
                      <p className="text-[11px] text-muted-foreground">{emp.email}</p>
                    </td>
                    <td className="px-4 py-2 text-xs text-foreground">{emp.department}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{emp.designation}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{emp.territory}</td>
                    <td className="px-4 py-2"><StatusPill status={emp.status} /></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{emp.joinDate}</td>
                    <td className="px-4 py-2">
                      <div className="relative flex justify-end">
                        <button onClick={() => setOpenMenu(openMenu === emp.id ? null : emp.id)}
                          className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {openMenu === emp.id && (
                          <div className="absolute right-0 top-7 z-50 bg-white border border-border rounded-xl shadow-lg w-40 py-1">
                            <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted"><Eye className="w-3.5 h-3.5 text-muted-foreground" /> View</button>
                            <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted"><Edit className="w-3.5 h-3.5 text-muted-foreground" /> Edit</button>
                            <div className="border-t border-border my-1" />
                            <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">Showing <span className="font-medium text-foreground">{filtered.length}</span> of <span className="font-medium text-foreground">{employees.length}</span> employees</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
